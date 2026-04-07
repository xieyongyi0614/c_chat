import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { CChatSocket, ClientToServerEvents, ServerToClientEvents } from '.';
import { MessageHandlerRegistry } from './message-handler.registry';
import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';
import { BrowserWindow } from 'electron';
import { Socket } from 'socket.io-client';
import { Command } from '@c_chat/shared-protobuf';
import { SOCKET_PROTO_EVENT, SocketProtoEventType } from '@c_chat/shared-protobuf/protoMap';

interface QueuedEvent {
  event: SocketProtoEventType;
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
    const event = command.event as SocketProtoEventType;
    const existingIndex = this.sendQueue.findIndex((q) => q.event === event);
    if (existingIndex > -1) {
      this.sendQueue[existingIndex] = { event, data: command };
    } else {
      this.sendQueue.push({ event, data: command });
    }
  }

  /** 渲染进程通信 */
  protected _sendToRenderer(
    mainWindow: BrowserWindow | null,
    channel: string,
    data?: unknown,
  ): void {
    if (!mainWindow?.webContents || mainWindow.isDestroyed()) {
      console.log('[Socket] Cannot send to renderer: window not available');
      return;
    }
    mainWindow.webContents.send(channel, data);
  }

  /** 事件订阅处理 */
  protected _setupSubscribeToEvent(socket: CChatSocket, mainWindow: BrowserWindow | null) {
    this.subscribeToEvent(SOCKET_PROTO_EVENT.getUserInfo, (data) => {
      if (data.id) {
        this._sendToRenderer(mainWindow, ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, data);
        MainWindowManager.getInstance().applyAuthState(true);
      } else {
        MainWindowManager.showToast('error', '登录失败，请检查用户名和密码');
        socket.disconnect();
      }
    });
    this.subscribeToEvent(SOCKET_PROTO_EVENT.getUserList, (data) => {
      console.log('subscribeToEvent getUserList', data);
    });
  }
}
