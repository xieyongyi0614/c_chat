import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { CChatSocket, ClientToServerEvents, ServerToClientEvents } from '.';
import { MessageHandlerRegistry } from './message-handler.registry';
import { Command, GetUserList, GetUserListResponse } from './proto';
import { SOCKET_PROTO_EVENT, SocketProtoEventType } from './proto/protoMap';
import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';
import { BrowserWindow } from 'electron';
import { UserTypes } from '@c_chat/shared-types';
import { Socket } from 'socket.io-client';

interface QueuedEvent {
  event: SocketProtoEventType;
  data: Command;
}

type GetUserListWaitEntry = {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
};

export class MessageHandler extends MessageHandlerRegistry {
  protected getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    throw new Error('Method not implemented.');
  }
  /** 发送消息队列 */
  private sendQueue: QueuedEvent[] = [];

  /** IPC 等与 getUserList 响应按 FIFO 配对（服务端需按请求顺序回包） */
  // private requestWaitQueue: Map<NodeJS.Timeout, GetUserListWaitEntry> = new Map();
  // private static readonly DEFAULT_WAIT_TIMEOUT_MS = 20_000;

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

  /** 渲染进程通过 IPC 拉取用户列表：发 socket 请求并等待同事件回包 */
  // async requestGetUserList(params: UserTypes.GetUserListParams): Promise<GetUserListResponse> {
  //   return await new Promise((resolve, reject) => {
  //     const timer = setTimeout(() => {
  //       const idx = this.requestWaitQueue.findIndex((w) => w.timer === timer);
  //       if (idx >= 0) {
  //         const [removed] = this.requestWaitQueue.splice(idx, 1);
  //         clearTimeout(removed.timer);
  //         removed.reject(new Error('获取用户列表超时'));
  //       }
  //     }, MessageHandler.DEFAULT_WAIT_TIMEOUT_MS);

  //     const entry: GetUserListWaitEntry = { resolve, reject, timer };
  //     this.requestWaitQueue.push(entry);

  //     try {
  //       const body = GetUserList.create({
  //         pagination: { page: params.page ?? 1, pageSize: params.pageSize ?? 10 },
  //         word: params.word ?? '',
  //       });
  //       this._sendMessageToService(
  //         SOCKET_PROTO_EVENT.getUserList,
  //         GetUserList.encode(body).finish(),
  //       );
  //     } catch (e) {
  //       const idx = this.requestWaitQueue.indexOf(entry);
  //       if (idx >= 0) {
  //         clearTimeout(timer);
  //         this.requestWaitQueue.splice(idx, 1);
  //       }
  //       reject(e instanceof Error ? e : new Error(String(e)));
  //     }
  //   });
  // }
  // private flushNextGetUserListWaiter(data: GetUserListResponse): void {
  //   const w = this.requestWaitQueue.shift();
  //   if (!w) return;
  //   clearTimeout(w.timer);
  //   try {
  //     const plain = GetUserListResponse.toObject(data, {
  //       longs: String,
  //       defaults: true,
  //     });
  //     w.resolve(plain);
  //   } catch (e) {
  //     w.reject(e instanceof Error ? e : new Error(String(e)));
  //   }
  // }

  // rejectAllGetUserListWaiters(reason: Error): void {
  //   while (this.requestWaitQueue.length > 0) {
  //     const w = this.requestWaitQueue.shift()!;
  //     clearTimeout(w.timer);
  //     w.reject(reason);
  //   }
  // }
}
