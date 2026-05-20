import { ELECTRON_TO_CLIENT_CHANNELS, MessageType, SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { CChatSocket, ClientToServerEvents, ServerToClientEvents } from '.';
import { MessageHandlerRegistry } from './message-handler.registry';
import { Socket } from 'socket.io-client';
import { Command, NewUpdateMessage } from '@c_chat/shared-protobuf';
import {
  ClientDecodeProtoMapKey,
  ClientDecodeProtoCallback,
  ServiceToClientEvent,
} from '@c_chat/shared-protobuf/protoMap';

import {
  conversationTableClass,
  messageTableClass,
  storeTableClass,
  uploadTaskTableClass,
} from '../../db';
import {
  ConversationTypeEnum,
  LocalConversationListItem,
  LocalMessageListItem,
  MessageStatusEnum,
  RequiredNonNullable,
  UploadStatusEnum,
  WebContentEvents,
} from '@c_chat/shared-types';
import { WindowManager } from '@c_chat/electron_client/main/windows';
import { to } from '@c_chat/shared-utils';
import { sendSocketMessageWithFile } from '../uploadTaskRunner';

interface QueuedEvent {
  event: ClientDecodeProtoMapKey;
  data: Command;
}

export class MessageHandler extends MessageHandlerRegistry {
  protected getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    throw new Error('Method not implemented.');
  }
  /** 发送消息队列 */
  private sendQueue: QueuedEvent[] = [];

  constructor(protected windowId: number) {
    super(windowId);
  }

  /** 发送消息队列 */
  protected _queueMessage(command: Command) {
    const event = command.event as ClientDecodeProtoMapKey;
    const existingIndex = this.sendQueue.findIndex((q) => q.event === event);
    if (existingIndex > -1) {
      this.sendQueue[existingIndex] = { event, data: command };
    } else {
      this.sendQueue.push({ event, data: command });
    }
  }

  /** 处理队列中的消息 */
  protected _processQueue(socket: CChatSocket) {
    if (this.sendQueue.length === 0) return;

    console.log(`[Socket] Processing ${this.sendQueue.length} queued messages`);
    while (this.sendQueue.length > 0) {
      const queued = this.sendQueue.shift();
      if (queued) {
        const data = Command.encode(queued.data).finish();
        socket.emit('message', data);
        console.log(`[Socket] Sent queued event: ${queued.event}`);
      }
    }
  }

  /** 渲染进程通信 */
  protected _sendToRenderer<T extends keyof WebContentEvents>(
    channel: T,
    data?: Parameters<WebContentEvents[T]>[0],
  ): void {
    const window = WindowManager.getInstance().getWindow(this.windowId);
    if (!window) {
      throw new Error(`窗口${this.windowId}不存在`);
    }
    if (!window?.webContents || window.isDestroyed()) {
      console.log('[Socket] Cannot send to renderer: window not available');
      return;
    }
    /** 错误消息处理 */
    if (channel === ELECTRON_TO_CLIENT_CHANNELS.ERROR) {
      const newData = data as Parameters<WebContentEvents['error']>[0];
      const errData = {
        errorCode: newData?.errorCode || SOCKET_ERROR_CODE.UNKNOWN,
        errorMessage: newData?.errorMessage || '未知错误，请联系管理员',
      };
      window.webContents.send(channel, errData);
      return;
    }
    window.webContents.send(channel, data);
  }

  /** 事件订阅处理 */
  protected _setupSubscribeToEvent(socket: CChatSocket) {
    const responseHandler: Partial<ClientDecodeProtoCallback> = {
      [ServiceToClientEvent.getUserInfoResponse]: (data) => {
        if (data.id) {
          const userInfo = {
            ...data,
            avatarUrl: data?.avatarUrl ?? '',
            nickname: data?.nickname ?? '',
          };
          this._sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, userInfo);
          // WindowManager.getInstance().applyWindowAuthState(this.windowId, true);
          storeTableClass.setUserInfo(userInfo, this.windowId);
        } else {
          // MainWindowManager.showToast('error', '登录失败，请检查用户名和密码');
          WindowManager.showToast(this.windowId, 'error', '登录失败，请检查用户名和密码');
          socket.disconnect();
        }
      },
      [ServiceToClientEvent.error]: (data) => {
        const { errorCode } = data;
        const errorHandler = {
          [SOCKET_ERROR_CODE.UNAUTHORIZED]: () => {
            socket.disconnect();
            // WindowManager.getInstance().applyWindowAuthState(this.windowId, false);
          },
        };
        errorHandler[errorCode as keyof typeof errorHandler]?.();
        this._sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.ERROR, data);

        console.log('socket error', data);
      },

      [ServiceToClientEvent.newUpdateMessage]: (data) => {
        console.log('收到实时消息更新', data);
        if (!data) {
          return;
        }

        const { messages, conversations } = data;
        const updateConvos = new Map<
          string,
          Pick<LocalConversationListItem, 'lastMsgContent' | 'lastMsgTime' | 'updateTime'>
        >();

        const newMessages: LocalMessageListItem[] =
          messages?.map((update) => {
            const {
              id,
              conversationId,
              msgId,
              clientMsgId,
              senderId,
              content,
              media,
              mediaGroupId,
              type,
              createTime,
              updateTime,
            } = update as RequiredNonNullable<NewUpdateMessage['messages'][number]>;
            const numCreateTime = Number(createTime);
            const numUpdateTime = Number(updateTime);

            updateConvos.set(conversationId, {
              lastMsgContent: content,
              lastMsgTime: numCreateTime,
              updateTime: numUpdateTime,
            });

            return {
              id,
              conversationId,
              msgId,
              clientMsgId,
              senderId,
              content,
              waveform: media?.waveform ?? '',
              fileId: media?.fileId ?? '',
              fileUrl: media?.fileUrl ?? media?.file?.url ?? '',
              fileName: media?.file?.fileName ?? '',
              mimeType: media?.file?.mimeType ?? '',
              fileSize: Number(media?.file?.size ?? 0),
              duration: media?.durationSec ?? 0,
              mediaGroupId: mediaGroupId ?? '',
              type: type as MessageType,
              status: MessageStatusEnum.success,
              createTime: numCreateTime,
              localTime: numUpdateTime,
              updateTime: numUpdateTime,
            };
          }) ?? [];

        messageTableClass.upsertMessages(newMessages);

        const pushedConversations: LocalConversationListItem[] =
          conversations?.map((convo) => ({
            id: convo.id ?? '',
            type: convo.type ?? ConversationTypeEnum.Single,
            targetId: convo.targetInfo?.id ?? '',
            targetName: convo.targetInfo?.name ?? '',
            targetAvatar: convo.targetInfo?.avatarUrl ?? '',
            lastMsgContent: convo.lastMsgContent ?? '',
            lastMsgTime: Number(convo.lastMsgTime ?? 0),
            unreadCount: convo.unreadCount ?? 0,
            lastReadMessageId: convo.lastReadMessageId ?? 0,
            updateTime: Number(convo.updateTime ?? 0),
            createTime: Number(convo.createTime ?? 0),
          })) ?? [];

        const localConvos = conversationTableClass.getConversationByIds(
          Array.from(updateConvos.keys()),
        );
        const currentUserId = storeTableClass.getUserInfo(this.windowId)?.id;
        const conversationById = new Map<string, LocalConversationListItem>();

        for (const convo of localConvos) {
          conversationById.set(convo.id, { ...convo, ...updateConvos.get(convo.id) });
        }

        for (const convo of pushedConversations) {
          const existing = conversationById.get(convo.id);
          const shouldReplace =
            !existing ||
            (Boolean(convo.targetId) && convo.targetId !== currentUserId) ||
            !existing.targetId ||
            existing.targetId === currentUserId;

          if (shouldReplace) {
            conversationById.set(convo.id, {
              ...existing,
              ...convo,
              ...updateConvos.get(convo.id),
            });
          }
        }

        const nextConversations = Array.from(conversationById.values());
        if (nextConversations.length > 0) {
          conversationTableClass.upsertConversations(nextConversations);
        }

        this._sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.newUpdateMessage, {
          messages: newMessages,
          conversations: nextConversations,
        });
      },
      [ServiceToClientEvent.sendFileUploadComplete]: async (data) => {
        const { uploadId, fileId } = data ?? {};
        if (!uploadId || !fileId) return;

        try {
          const task = uploadTaskTableClass.getByUploadSessionId(uploadId);
          if (!task) return;

          uploadTaskTableClass.updateFields(task.id, {
            file_id: fileId,
            status: UploadStatusEnum.success,
          });

          if (task.clientMsgId) {
            messageTableClass.updateFileIdByClientId(task.clientMsgId, fileId);
          }

          const msg = messageTableClass.getByClientMsgId(task.clientMsgId);
          console.log('sendFileUploadComplete waveform', typeof msg?.waveform, msg?.waveform);
          if (msg) {
            const [sendErr] = await to(
              sendSocketMessageWithFile(task.windowId ?? 1, {
                conversationId: msg.conversationId,
                clientMsgId: msg.clientMsgId,
                fileId,
                durationSec: msg.duration,
                waveform: msg.waveform,
                type: msg.type,
                mediaGroupId: msg.mediaGroupId || undefined,
                content: msg.content,
              }),
            );

            if (sendErr) {
              throw sendErr;
            }
          }
        } catch (err) {
          console.error('[Socket] handle uploadComplete error', err);
        }
      },
    };

    const handleEvent = Object.values(ServiceToClientEvent).filter(
      (item) => item !== ServiceToClientEvent.pong,
    );
    handleEvent.forEach((e) => {
      this.subscribeToEvent(e, (data: unknown) => {
        const handle = responseHandler[e];
        if (handle) {
          handle(data as never);
          return;
        }
        // console.log(`subscribeToEvent ${e}锛歚, data);
      });
    });
  }
}
