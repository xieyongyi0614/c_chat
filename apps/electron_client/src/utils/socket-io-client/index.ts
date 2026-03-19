// src/main/services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import { BrowserWindow, ipcMain } from 'electron';
import logger from '../logger';

// ==================== 类型定义 ====================
export interface SocketEventMap {
  // 定义你的业务事件类型（示例）
  message: { id: string; content: string; timestamp: number };
  'user-joined': { userId: string; name: string };
  'user-left': { userId: string };
}

export interface SocketError {
  code: string;
  message: string;
  timestamp: number;
}

export type SocketEvent = keyof SocketEventMap;
export type SocketEventData<E extends SocketEvent> = SocketEventMap[E];

// ==================== 核心服务 ====================
export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private mainWindow: BrowserWindow | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private accessToken: string | null = null;

  // 单例模式
  private constructor() {
    this.setupIpcHandlers();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * 安全初始化（必须在 app ready 后调用）
   */
  public init(mainWindow: BrowserWindow, accessToken: string): void {
    this.mainWindow = mainWindow;
    this.accessToken = accessToken;

    // 从环境变量获取 URL（避免硬编码）
    const socketUrl = process.env.SOCKET_URL || 'http://localhost:3001/chat';

    this.connect(socketUrl);
  }

  private connect(url: string): void {
    // 清理旧连接
    this.destroy();

    logger.info(`[Socket] Connecting to ${url}`);

    this.socket = io(url, {
      transports: ['websocket'], // 强制使用 WS
      auth: { token: this.accessToken }, // 传递认证令牌
      reconnection: false, // 自定义重连逻辑
      timeout: 10000,
    });

    this.setupSocketListeners();

    // 连接超时保护
    const timeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        logger.error('[Socket] Initial connection timeout');
        this.handleConnectError(new Error('Connection timeout'));
      }
    }, 15000);

    this.socket.once('connect', () => clearTimeout(timeout));
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      logger.success(`[Socket] Connected. ID: ${this.socket?.id}`);
      this.sendToRenderer('socket-connected');
    });

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      logger.warn(`[Socket] Disconnected: ${reason}`);
      this.sendToRenderer('socket-disconnected', reason);

      // 非主动断开时尝试重连
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      logger.error(`[Socket] Connect error: ${error.message}`);
      this.handleConnectError(error);
    });

    // 业务事件监听（类型安全）
    this.registerBusinessEvents();
  }

  private registerBusinessEvents(): void {
    if (!this.socket) return;

    // 精确注册业务事件（避免通配符性能开销）
    this.socket.on('message', (data) => this.handleTypedEvent('message', data));

    this.socket.on('user-joined', (data) => this.handleTypedEvent('user-joined', data));

    this.socket.on('user-left', (data) => this.handleTypedEvent('user-left', data));
  }

  private handleTypedEvent<E extends SocketEvent>(event: E, data: SocketEventData<E>): void {
    // 开发环境数据验证
    if (process.env.NODE_ENV === 'development') {
      try {
        this.validateEventData(event, data);
      } catch (error) {
        logger.error(`[Socket] Invalid data for event "${event}":`, error);
        return;
      }
    }

    this.sendToRenderer(`socket-event:${event}`, data);
  }

  private validateEventData<E extends SocketEvent>(
    event: E,
    data: any,
  ): asserts data is SocketEventData<E> {
    // 这里可集成 zod 做运行时验证
    if (event === 'message' && !data.content) {
      throw new Error('Missing content field in message event');
    }
    // 其他事件验证...
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[Socket] Max reconnection attempts reached. Giving up.');
      this.sendToRenderer('socket-error', {
        code: 'MAX_RECONNECT',
        message: 'Failed to reconnect after multiple attempts',
        timestamp: Date.now(),
      } as SocketError);
      return;
    }

    const delay = this.reconnectDelay * (this.reconnectAttempts + 1);
    this.reconnectAttempts++;

    logger.info(
      `[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );
    this.sendToRenderer('socket-reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay,
    });

    setTimeout(() => {
      if (this.socket?.disconnected) {
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

  private sendToRenderer(channel: string, data?: any): void {
    if (!this.mainWindow?.webContents || this.mainWindow.isDestroyed()) {
      logger.warn('[Socket] Cannot send to renderer: window not available');
      return;
    }
    this.mainWindow.webContents.send(channel, data);
  }

  // ==================== IPC 通信 ====================
  private setupIpcHandlers(): void {
    // 渲染进程请求发送事件
    ipcMain.on('socket-emit', (event, eventName: string, data: any) => {
      if (!this.socket?.connected) {
        logger.warn(`[Socket] Emit failed - not connected: ${eventName}`);
        return;
      }

      // 安全白名单机制（关键！）
      if (!this.isValidEvent(eventName)) {
        logger.error(`[Socket] Invalid emit event: ${eventName}`);
        return;
      }

      logger.debug(`[Socket] Emitting: ${eventName}`, data);
      this.socket.emit(eventName, data);
    });

    // 获取连接状态
    ipcMain.handle('socket-get-state', () => {
      return {
        connected: this.socket?.connected || false,
        id: this.socket?.id || null,
        attempts: this.reconnectAttempts,
      };
    });
  }

  private isValidEvent(eventName: string): boolean {
    // 严格白名单（防止任意事件触发）
    const allowedEvents = ['send-message', 'join-room', 'leave-room'];
    return allowedEvents.includes(eventName);
  }

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
    if (!this.socket) return;

    this.disconnect();

    // 清理资源
    if (this.socket) {
      this.socket.offAny(); // 移除所有监听
      this.socket = null;
    }

    // 清理 IPC 监听（防止内存泄漏）
    ipcMain.removeAllListeners('socket-emit');
    ipcMain.removeHandler('socket-get-state');

    this.mainWindow = null;
    this.accessToken = null;
    logger.info('[Socket] Service destroyed');
  }
}

export const socketService = SocketService.getInstance();
