import { io, Socket } from 'socket.io-client';
import logger from '../logger';
import { storeTableClass } from '@c_chat/electron_client/db';
import { ELECTRON_TO_CLIENT_CHANNELS, SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { MessageHandler } from './message.handler';

import { WebContentEvents } from '@c_chat/shared-types';
import { ClientToServiceEvent, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';

export interface ServerToClientEvents {
  message: (data: Uint8Array | Buffer) => void;
  auth_error: (data: { message: string; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  message: (data: Uint8Array<ArrayBufferLike>) => void;
}

export type CChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket服务类 - 每个窗口独立的socket连接
 */
export class SocketService extends MessageHandler {
  private socket: CChatSocket | null = null;

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

  constructor(windowId: number) {
    super(windowId);
  }

  public getUserInfo() {
    return storeTableClass.getUserInfo(this.windowId);
  }

  async init() {
    const socketUrl = process.env.SOCKET_URL || 'http://localhost:3001/chat';
    this.connect(socketUrl);
  }

  async connect(url: string) {
    this.destroy();
    logger.info(`[Socket ${this.windowId}] Connecting to ${url}`);

    if (!this.accessToken) {
      const accessToken = storeTableClass.getAccessToken(this.windowId);
      if (!accessToken) {
        const error = new Error('No access token found');
        logger.error(`[Socket ${this.windowId}] ${error.message}`);
        throw error;
      }
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
        logger.error(`[Socket ${this.windowId}] Initial connection timeout`);
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
      logger.success(`[Socket ${this.windowId}] 连接成功. ID: ${this.socket?.id}`);
      this.setupPingTimer();

      this.subscribeToEvent(ServiceToClientEvent.pong, () => {
        console.log(`[客户端 ${this.windowId}] 收到 ${ServiceToClientEvent.pong}`);
        this.cancelPendingReconnect();
      });
      if (this.socket) {
        this._setupSubscribeToEvent(this.socket);
        this._processQueue(this.socket);
      }
    });

    /** 断开连接 */
    this.socket.on('disconnect', (reason) => {
      this.rejectAllWaiters(new Error(`Socket 断开: ${reason}`));
      logger.warn(`[Socket ${this.windowId}] Disconnected: ${reason}`);
      this.sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.SocketDisconnected, reason);

      /** 非主动断开时尝试重连 */
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    /** 连接错误 */
    this.socket.on('connect_error', (error) => {
      logger.error(`[Socket ${this.windowId}] Connect error: ${error.message}`);
      this.isReconnecting = false;
      this.handleConnectError(error);
    });

    /** 接收到protobuf消息 */
    this.socket.on('message', this.dispatch.bind(this));
  }

  /** 设置ping定时器 */
  private setupPingTimer() {
    if (this.pingTimerId) clearInterval(this.pingTimerId);

    this.pingTimerId = setInterval(() => {
      if (!this.socket?.connected) return;

      this._sendMessageToService(ClientToServiceEvent.ping);

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
      logger.error(`[Socket ${this.windowId}] Max reconnection attempts reached. Giving up.`);
      this.sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.ERROR, {
        errorCode: SOCKET_ERROR_CODE.UNKNOWN,
        errorMessage: 'Failed to reconnect after multiple attempts',
      });
      return;
    }
    this.isReconnecting = true;

    const delay = this.RECONNECT_DELAY * (this.reconnectAttempts + 1);
    this.reconnectAttempts++;

    logger.info(
      `[Socket ${this.windowId}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );
    this.sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.SocketReconnecting, {
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
    this.sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.ERROR, {
      errorCode: SOCKET_ERROR_CODE.INTERNAL_ERROR,
      errorMessage: error.message,
    });

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
      logger.info(`[Socket ${this.windowId}] Disconnected manually`);
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

    // 清理定时器
    if (this.pingTimerId) {
      clearInterval(this.pingTimerId);
      this.pingTimerId = undefined;
    }
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = undefined;
    }

    this.accessToken = null;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    logger.info(`[Socket ${this.windowId}] Service destroyed`);
  }

  protected getSocket() {
    return this.socket;
  }

  /** 渲染进程通信中转 */
  sendToRenderer<T extends keyof WebContentEvents>(
    channel: T,
    data?: Parameters<WebContentEvents[T]>[0],
  ) {
    this._sendToRenderer(channel, data);
  }
}

/**
 * Socket管理器 - 管理每个窗口的socket连接
 */
export class SocketManager {
  private static instance: SocketManager;
  private sockets: Map<number, SocketService> = new Map();

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * 获取或创建指定窗口的socket服务
   * @param windowId 窗口ID
   */
  public getSocketService(windowId: number): SocketService {
    if (!this.sockets.has(windowId)) {
      this.sockets.set(windowId, new SocketService(windowId));
    }
    return this.sockets.get(windowId)!;
  }

  /**
   * 初始化指定窗口的socket连接
   * @param windowId 窗口ID
   * @param mainWindow 窗口实例
   */
  public async initSocket(windowId: number): Promise<void> {
    const socketService = this.getSocketService(windowId);
    await socketService.init();
  }

  /**
   * 销毁指定窗口的socket连接
   * @param windowId 窗口ID
   */
  public destroySocket(windowId: number): void {
    const socketService = this.sockets.get(windowId);
    if (socketService) {
      socketService.destroy();
      this.sockets.delete(windowId);
      logger.info(`[SocketManager] Socket for window ${windowId} destroyed`);
    }
  }

  /**
   * 断开指定窗口的socket连接
   * @param windowId 窗口ID
   */
  public disconnectSocket(windowId: number): void {
    const socketService = this.sockets.get(windowId);
    if (socketService) {
      socketService.disconnect();
    }
  }

  /**
   * 销毁所有socket连接
   */
  public destroyAll(): void {
    this.sockets.forEach((socketService, windowId) => {
      socketService.destroy();
      logger.info(`[SocketManager] Socket for window ${windowId} destroyed`);
    });
    this.sockets.clear();
  }

  /**
   * 获取所有socket服务
   */
  public getAllSocketServices(): SocketService[] {
    return Array.from(this.sockets.values());
  }

  /**
   * 检查指定窗口是否有socket连接
   * @param windowId 窗口ID
   */
  public hasSocket(windowId: number): boolean {
    return this.sockets.has(windowId);
  }
}

export const socketManager = SocketManager.getInstance();
