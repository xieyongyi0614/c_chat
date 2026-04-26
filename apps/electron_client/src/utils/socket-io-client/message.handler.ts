import { ELECTRON_TO_CLIENT_CHANNELS, SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { CChatSocket, ClientToServerEvents, ServerToClientEvents } from '.';
import { MessageHandlerRegistry } from './message-handler.registry';
import { Socket } from 'socket.io-client';
import { Command } from '@c_chat/shared-protobuf';
import {
  SOCKET_PROTO_EVENT,
  ClientDecodeProtoMapKey,
  ClientDecodeProtoCallback,
} from '@c_chat/shared-protobuf/protoMap';

import { conversationTableClass, messageTableClass } from '../../db';
import { WebContentEvents } from '@c_chat/shared-types';
import { WindowManager } from '@c_chat/electron_client/main/windows';

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
  protected _sendToRenderer(channel: string, data?: unknown): void {
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
      [SOCKET_PROTO_EVENT.getUserInfo]: (data) => {
        if (data.id) {
          this._sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, data);
          WindowManager.getInstance().applyWindowAuthState(this.windowId, true);
        } else {
          // MainWindowManager.showToast('error', '登录失败，请检查用户名和密码');
          WindowManager.showToast(this.windowId, 'error', '登录失败，请检查用户名和密码');
          socket.disconnect();
        }
      },
      [SOCKET_PROTO_EVENT.error]: (data) => {
        const { errorCode } = data;
        const errorHandler = {
          [SOCKET_ERROR_CODE.UNAUTHORIZED]: () => {
            socket.disconnect();
            WindowManager.getInstance().applyWindowAuthState(this.windowId, false);
          },
        };
        errorHandler[errorCode as keyof typeof errorHandler]?.();
        this._sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.ERROR, data);

        console.log('socket error', data);
      },

      [SOCKET_PROTO_EVENT.sendMessage]: (data) => {
        console.log('收到实时消息推送:', data);
        if (data) {
          // 1. 写入本地消息表
          messageTableClass.upsertMessages([
            {
              id: data.id,
              msgId: data.msgId,
              senderId: data.senderId,
              conversationId: data.conversationId,
              content: data.content,
              type: data.type,
              state: 0,
              createTime: Number(data.createTime),
              updateTime: Number(data.updateTime),
            },
          ]);

          // 2. 更新本地会话表快照
          const convo = conversationTableClass.getConversation(data.conversationId);
          if (convo) {
            conversationTableClass.upsertConversations([
              {
                ...convo,
                lastMsgContent: data.content,
                lastMsgTime: Number(data.createTime),
                updateTime: Number(data.updateTime),
              },
            ]);
          }

          // 3. 通知渲染进程刷新 UI
          this._sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.SocketMessage, data);
        }
      },
    };

    const handleEvent = Object.values(SOCKET_PROTO_EVENT).filter(
      (item) => item !== SOCKET_PROTO_EVENT.ping,
    );
    handleEvent.forEach((e) => {
      this.subscribeToEvent(e, (data: unknown) => {
        const handle = responseHandler[e];
        if (handle) {
          handle(data as never);
          return;
        }
        // console.log(`subscribeToEvent ${e}：`, data);
      });
    });
  }
}
