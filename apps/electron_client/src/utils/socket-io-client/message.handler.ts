import { ELECTRON_TO_CLIENT_CHANNELS, MessageType, SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { RealtimeClient } from '@c_chat/shared-api';
import { NewUpdateMessage } from '@c_chat/shared-protobuf';
import { ClientDecodeProtoCallback, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';

import {
  conversationTableClass,
  messageTableClass,
  storeTableClass,
  uploadTaskTableClass,
} from '../../db';
import {
  ConversationType,
  LocalConversationListItem,
  LocalMessageListItem,
  MessageStatus,
  RequiredNonNullable,
  UploadStatus,
  WebContentEvents,
} from '@c_chat/shared-types';
import { WindowManager } from '@c_chat/electron_client/main/windows';
import { generateLastMsgContent } from '@c_chat/shared-utils';

/** 向指定窗口渲染进程发送消息 */
export function sendToRenderer<T extends keyof WebContentEvents>(
  windowId: number,
  channel: T,
  data?: Parameters<WebContentEvents[T]>[0],
): void {
  const window = WindowManager.getInstance().getWindow(windowId);
  if (!window) {
    throw new Error(`窗口 ${windowId} 不存在`);
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

/** 注册 electron 业务事件处理器到实时客户端 */
export function registerSocketEventHandlers(client: RealtimeClient, windowId: number) {
  const responseHandler: Partial<ClientDecodeProtoCallback> = {
    [ServiceToClientEvent.getUserInfoResponse]: (data) => {
      if (data.id) {
        const userInfo = {
          ...data,
          avatarUrl: data?.avatarUrl ?? '',
          nickname: data?.nickname ?? '',
        };
        sendToRenderer(windowId, ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, userInfo);
        storeTableClass.setUserInfo(userInfo, windowId);
        WindowManager.getInstance().notifyWindowStateChange();
      } else {
        WindowManager.showToast(windowId, 'error', '登录失败，请检查用户名和密码');
        client.disconnect();
      }
    },
    [ServiceToClientEvent.error]: (data) => {
      const { errorCode } = data;
      const errorHandler = {
        [SOCKET_ERROR_CODE.UNAUTHORIZED]: () => {
          client.disconnect();
        },
      };
      errorHandler[errorCode as keyof typeof errorHandler]?.();
      sendToRenderer(windowId, ELECTRON_TO_CLIENT_CHANNELS.ERROR, data);

      console.log('socket error', data);
    },

    [ServiceToClientEvent.newUpdateMessage]: (data) => {
      console.log('收到实时消息更新', data);
      if (!data) {
        return;
      }

      const { messages, conversations, removedConversationIds } = data;
      const updateConvos = new Map<
        string,
        Pick<LocalConversationListItem, 'lastMsgContent' | 'lastMsgTime' | 'updateTime'>
      >();

      const newMessages: LocalMessageListItem[] =
        messages?.map((update) => {
          const {
            id,
            conversationId,
            seq,
            clientMsgId,
            senderId,
            senderInfo,
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
            lastMsgContent: generateLastMsgContent(type as MessageType, content),
            lastMsgTime: numCreateTime,
            updateTime: numUpdateTime,
          });

          return {
            id,
            conversationId,
            seq: BigInt(seq),
            clientMsgId,
            senderId,
            senderNickname: senderInfo?.nickname ?? senderInfo?.email ?? '',
            senderAvatar: senderInfo?.avatarUrl ?? '',
            senderEmail: senderInfo?.email ?? '',
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
            status: MessageStatus.success,
            createTime: numCreateTime,
            localTime: numUpdateTime,
            updateTime: numUpdateTime,
          };
        }) ?? [];

      messageTableClass.upsertMessages(newMessages);

      const pushedConversations: LocalConversationListItem[] =
        conversations?.map((convo) => ({
          id: convo.id ?? '',
          type: (convo.type ?? ConversationType.Single) as ConversationType,
          targetId: convo.targetInfo?.id ?? '',
          targetName: convo.targetInfo?.name ?? '',
          targetAvatar: convo.targetInfo?.avatarUrl ?? '',
          lastMsgContent: convo.lastMsgContent ?? '',
          lastMsgTime: Number(convo.lastMsgTime ?? 0),
          unreadCount: convo.unreadCount ?? 0,
          lastReadSeq: BigInt(convo.lastReadSeq ?? 0),
          updateTime: Number(convo.updateTime ?? 0),
          createTime: Number(convo.createTime ?? 0),
        })) ?? [];

      const currentUserId = storeTableClass.getUserInfo(windowId)?.id;
      const incomingCountByConversation = new Map<string, number>();
      if (currentUserId) {
        for (const message of newMessages) {
          if (message.senderId !== currentUserId) {
            incomingCountByConversation.set(
              message.conversationId,
              (incomingCountByConversation.get(message.conversationId) ?? 0) + 1,
            );
          }
        }
      }

      const conversationIds = Array.from(
        new Set([
          ...Array.from(updateConvos.keys()),
          ...pushedConversations.map((conversation) => conversation.id).filter(Boolean),
        ]),
      );
      const localConvos = conversationTableClass.getConversationByIds(conversationIds);
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
          const incomingCount = incomingCountByConversation.get(convo.id) ?? 0;
          const unreadCount =
            incomingCount > 0
              ? (existing?.unreadCount ?? convo.unreadCount ?? 0) + incomingCount
              : convo.unreadCount;
          conversationById.set(convo.id, {
            ...existing,
            ...convo,
            ...updateConvos.get(convo.id),
            unreadCount,
          });
        }
      }

      const nextConversations = Array.from(conversationById.values());
      if (nextConversations.length > 0) {
        conversationTableClass.upsertConversations(nextConversations);
      }

      if (removedConversationIds?.length) {
        removedConversationIds.forEach((conversationId) =>
          conversationTableClass.deleteConversation(conversationId),
        );
      }

      sendToRenderer(windowId, ELECTRON_TO_CLIENT_CHANNELS.newUpdateMessage, {
        messages: newMessages,
        conversations: nextConversations,
        removedConversationIds: removedConversationIds ?? [],
      });
    },
    [ServiceToClientEvent.sendFileUploadComplete]: (data) => {
      const { uploadId, fileId } = data ?? {};
      if (!uploadId || !fileId) return;

      const task = uploadTaskTableClass.getByUploadSessionId(uploadId);
      if (!task) return;

      uploadTaskTableClass.updateFields(task.id, {
        file_id: fileId,
        status: UploadStatus.success,
      });

      if (task.clientMsgId) {
        messageTableClass.updateFileIdByClientId(task.clientMsgId, fileId);
      }
    },
  };

  const handleEvent = Object.values(ServiceToClientEvent).filter(
    (item) => item !== ServiceToClientEvent.pong,
  );
  handleEvent.forEach((e) => {
    client.subscribeToEvent(e, (data: unknown) => {
      const handle = responseHandler[e];
      if (handle) {
        handle(data as never);
        return;
      }
    });
  });
}
