import { io, Socket } from 'socket.io-client';
import { BrowserWindow } from 'electron';
import logger from '../logger';
import { storeTableClass } from '@c_chat/electron_client/db';
import { db } from '@c_chat/shared-config';
import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';
import { MessageHandler } from './message.handler';
import { SOCKET_PROTO_EVENT } from '@c_chat/shared-protobuf/protoMap';

export interface ServerToClientEvents {
  message: (data: Uint8Array | Buffer) => void;
  auth_error: (data: { message: string; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  message: (data: Uint8Array<ArrayBufferLike>) => void;
}

export interface SocketError {
  code: string;
  message: string;
  timestamp: number;
}

export type CChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketService extends MessageHandler {
  protected windowId = db.DEFAULT_WINDOW_ID;
  private static instance: SocketService;
  private socket: CChatSocket | null = null;

  private mainWindow: BrowserWindow | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private accessToken: string | null = null;

  private pingTimerId?: NodeJS.Timeout;
  private reconnectTimerId?: NodeJS.Timeout;
  private isReconnecting = false;

  // 30s连接超时
  private readonly AUTH_TIMEOUT = 30000;
  // 10秒ping一次
  private readonly PING_INTERVAL = 10000;
  // 5秒ping超时
  private readonly PING_TIMEOUT = 5000;
  // 固定重连延迟 5秒
  private readonly RECONNECT_DELAY = 5000;

  private constructor(windowId = db.DEFAULT_WINDOW_ID) {
    super(windowId);

    this.windowId = windowId;
    this.setupIpcHandlers();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  async init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    const socketUrl = process.env.SOCKET_URL || 'http://localhost:3001/chat';
    this.connect(socketUrl);
  }

  async connect(url: string) {
    this.destroy();
    logger.info(`[Socket] Connecting to ${url}`);
    if (!this.accessToken) {
      const accessToken = storeTableClass.getAccessToken(this.windowId);
      if (!accessToken) return;
      this.accessToken = accessToken;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      auth: { token: this.accessToken },
      reconnection: false,
      timeout: 10000,
    });

    // 连接超时保护
    const timeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        logger.error('[Socket] Initial connection timeout');
        const error = new Error('Connection timeout');
        this.handleConnectError(error);
        return;
      }
    }, this.AUTH_TIMEOUT);

    /** 连接成功 */
    this.socket.on('connect', () => {
      if (timeout) clearTimeout(timeout);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      logger.success(`[Socket] 连接成功. ID: ${this.socket?.id}`);
      this.setupPingTimer();

      this.subscribeToEvent(SOCKET_PROTO_EVENT.ping, () => {
        console.log(`[客户端 ${this.windowId}] 收到 ${SOCKET_PROTO_EVENT.ping}`);
        this.cancelPendingReconnect();
      });
      if (this.socket) {
        this._setupSubscribeToEvent(this.socket, this.mainWindow);
      }
    });

    /** 断开连接 */
    this.socket.on('disconnect', (reason) => {
      this.rejectAllWaiters(new Error(`Socket 断开: ${reason}`));
      logger.warn(`[Socket] Disconnected: ${reason}`);
      this.sendToRenderer('socket-disconnected', reason);

      /** 非主动断开时尝试重连 */
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    /** 连接错误 */
    this.socket.on('connect_error', (error) => {
      logger.error(`[Socket] Connect error: ${error.message}`);
      this.isReconnecting = false;
      this.handleConnectError(error);
    });

    /** 接收到protobuf消息 */
    this.socket.on('message', this.dispatch.bind(this));

    /** 连接socket认证失败 */
    this.socket.on('auth_error', (data) => {
      console.log('auth_error', data);
      MainWindowManager.showToast('error', data.message);
      this.socket?.disconnect();
    });
  }

  /** 设置ping定时器 */
  private setupPingTimer() {
    if (this.pingTimerId) clearInterval(this.pingTimerId);

    this.pingTimerId = setInterval(() => {
      if (!this.socket?.connected) return;

      this._sendMessageToService(SOCKET_PROTO_EVENT.ping);

      this.cancelPendingReconnect();

      this.reconnectTimerId = setTimeout(() => {
        this.handlePingTimeout();
      }, this.PING_TIMEOUT);
    }, this.PING_INTERVAL);
  }

  private handlePingTimeout() {
    if (this.pingTimerId) {
      clearInterval(this.pingTimerId);
      this.pingTimerId = undefined;
    }

    if (this.isReconnecting) return;

    logger.info(`[客户端 ${this.windowId}] Ping失败重连，延迟${this.RECONNECT_DELAY}ms`);

    this.reconnectTimerId = setTimeout(() => {
      if (this.isReconnecting) return;
      logger.info(`[客户端 ${this.windowId}] 开始Ping失败重连`);
      this.scheduleReconnect();
    }, this.RECONNECT_DELAY);
  }

  /** 取消计划中的重连 */
  private cancelPendingReconnect() {
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = undefined;
    }
  }

  /** 计划重连 */
  private scheduleReconnect() {
    if (this.isReconnecting) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[Socket] Max reconnection attempts reached. Giving up.');
      this.sendToRenderer('socket-error', {
        code: 'MAX_RECONNECT',
        message: 'Failed to reconnect after multiple attempts',
        timestamp: Date.now(),
      } as SocketError);
      return;
    }
    this.isReconnecting = true;

    const delay = this.RECONNECT_DELAY * (this.reconnectAttempts + 1);
    this.reconnectAttempts++;

    logger.info(
      `[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );
    this.sendToRenderer('socket-reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay,
    });

    this.reconnectTimerId = setTimeout(() => {
      if (this.socket) {
        this.disconnect();
        this.socket.connect();
      }
    }, delay);
  }

  private handleConnectError(error: Error): void {
    const socketError: SocketError = {
      code: error.name || 'CONNECTION_ERROR',
      message: error.message,
      timestamp: Date.now(),
    };

    this.sendToRenderer('socket-error', socketError);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // ==================== IPC 通信 ====================
  private setupIpcHandlers(): void {
    // 渲染进程请求发送事件
    // ipcMain.on('socket-emit', (event, eventName: string, data: any) => {
    //   if (!this.socket?.connected) {
    //     logger.warn(`[Socket] Emit failed - not connected: ${eventName}`);
    //     return;
    //   }
    //   // 安全白名单机制（关键！）
    //   if (!this.isValidEvent(eventName)) {
    //     logger.error(`[Socket] Invalid emit event: ${eventName}`);
    //     return;
    //   }
    //   logger.debug(`[Socket] Emitting: ${eventName}`, data);
    //   this.socket.emit(eventName, data);
    // });
    // // 获取连接状态
    // ipcMain.handle('socket-get-state', () => {
    //   return {
    //     connected: this.socket?.connected || false,
    //     id: this.socket?.id || null,
    //     attempts: this.reconnectAttempts,
    //   };
    // });
  }

  // private isValidEvent(eventName: string): boolean {
  //   // 严格白名单（防止任意事件触发）
  //   const allowedEvents = ['send-message', 'join-room', 'leave-room'];
  //   return allowedEvents.includes(eventName);
  // }

  // ==================== 生命周期管理 ====================
  /**
   * 安全断开（保留实例）
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      logger.info('[Socket] Disconnected manually');
    }
  }

  /**
   * 彻底销毁（窗口关闭时调用）
   */
  public destroy(): void {
    this.rejectAllWaiters(new Error('Socket 已销毁'));
    if (!this.socket) return;

    this.disconnect();

    // 清理资源
    if (this.socket) {
      this.socket.offAny(); // 移除所有监听
      this.socket = null;
    }

    // 清理 IPC 监听（防止内存泄漏）
    // ipcMain.removeAllListeners('socket-emit');
    // ipcMain.removeHandler('socket-get-state');

    this.mainWindow = null;
    this.accessToken = null;
    logger.info('[Socket] Service destroyed');
  }

  protected getSocket() {
    return this.socket;
  }

  /** 渲染进程通信中转 */
  sendToRenderer(channel: string, data?: unknown) {
    this._sendToRenderer(this.mainWindow, channel, data);
  }
}

export const socketService = SocketService.getInstance();
