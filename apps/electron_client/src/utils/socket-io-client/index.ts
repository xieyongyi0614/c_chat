import { io, Socket } from 'socket.io-client';
import { BrowserWindow } from 'electron';
import logger from '../logger';
import { storeTableClass } from '@c_chat/electron_client/db';
import initOsData from '../osData';
import { db, ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { Command } from './proto';
import {
  protoMap,
  SocketProtoEventType,
  SOCKET_PROTO_EVENT,
  SocketProtoEventData,
} from './proto/protoMap';
import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';

// ==================== 类型定义 ====================
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

interface QueuedEvent {
  event: SocketProtoEventType;
  data: Command;
}

// ==================== 核心服务 ====================
export class SocketService {
  private windowId = db.DEFAULT_WINDOW_ID;
  private static instance: SocketService;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private sendQueue: QueuedEvent[] = [];

  /**
   * 事件监听器注册表
   *
   * 结构说明:
   * - 外层 Map Key (ProtoMapKey 事件名)
   * - 内层 Map (EventListenerMap): 该事件类型下所有订阅者的集合
   *   - Key: 订阅者的唯一标识 (用于精确取消订阅，默认是外层Map Key)
   *   - Value: 具体的回调函数
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventListeners: Map<SocketProtoEventType, Map<string, (data: any) => void>> = new Map();

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

  // 单例模式
  private constructor(windowId = db.DEFAULT_WINDOW_ID) {
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
      this._setupSubscribeToEvent();
    });

    /** 断开连接 */
    this.socket.on('disconnect', (reason) => {
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
    this.socket.on('message', this.handleProtobufMessage.bind(this));

    /** 连接socket认证失败 */
    this.socket.on('auth_error', (data) => {
      console.log('auth_error', data);
      MainWindowManager.showToast('error', data.message);
      this.socket?.disconnect();
    });
  }
  private _setupSubscribeToEvent() {
    this.subscribeToEvent(SOCKET_PROTO_EVENT.ping, () => {
      console.log(`[客户端 ${this.windowId}] 收到 ${SOCKET_PROTO_EVENT.ping}`);
      this.cancelPendingReconnect();
    });
    this.subscribeToEvent(SOCKET_PROTO_EVENT.getUserInfo, (data) => {
      if (data.id) {
        this.sendToRenderer(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, data);
        MainWindowManager.getInstance().applyAuthState(true);
      } else {
        MainWindowManager.showToast('error', '登录失败，请检查用户名和密码');
        this.socket?.disconnect();
      }
    });
  }

  /** 设置ping定时器 */
  private setupPingTimer() {
    // 清除现有定时器
    if (this.pingTimerId) {
      clearInterval(this.pingTimerId);
    }

    const osData = initOsData();
    const userInfo = storeTableClass.getUserInfo(this.windowId);

    // 设置 ping 定时器
    this.pingTimerId = setInterval(() => {
      if (!this.socket?.connected) {
        return;
      }

      const pingCommand = Command.create({
        event: SOCKET_PROTO_EVENT.ping,
        userId: userInfo?.id,
        client: osData.machineId,
      });

      this.emitEvent(pingCommand);

      this.cancelPendingReconnect();

      this.reconnectTimerId = setTimeout(() => {
        this.handlePingTimeout();
      }, this.PING_TIMEOUT);
    }, this.PING_INTERVAL);
  }
  sendMessage(event: SocketProtoEventType) {
    const osData = initOsData();
    const userInfo = storeTableClass.getUserInfo(this.windowId);
    const command = Command.create({
      event,
      userId: userInfo?.id,
      client: osData.machineId,
    });
    this.emitEvent(command);
  }

  /** 处理ping超时 */
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

  private handleProtobufMessage(data: Uint8Array | Buffer) {
    const command = Command.decode(data);
    const event = command.event as SocketProtoEventType;

    // 处理其他事件
    const listener = this.eventListeners.get(event);
    if (listener) {
      if (listener instanceof Map) {
        // 多订阅广播
        listener?.forEach((callback) => {
          try {
            const clazz = protoMap[event];
            const decodedResult = clazz?.decode(command.body[0]);
            if (decodedResult) {
              console.log(
                '============================处理订阅广播========================================',
              );
              console.log(`收到消息：Event=${event}`);
              console.log(decodedResult);
              console.log(
                '============================处理订阅广播========================================',
              );
            }
            callback(decodedResult);
          } catch (err) {
            console.error(`[客户端 ${this.windowId}] 处理事件出错:`, err);
          }
        });
      }
    }
  }

  subscribeToEvent<T extends SocketProtoEventType>(
    event: T,
    callback: SocketProtoEventData[T],
    comIdentification?: string,
  ) {
    if (!this.eventListeners) this.eventListeners = new Map();
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Map());
    }
    const listeners = this.eventListeners.get(event);
    listeners?.set(comIdentification ?? String(event), callback);
    return this.subscribeToEvent;
  }

  unsubscribeFromEvent(type: SocketProtoEventType, comIdentification?: string): void {
    if (!this.eventListeners) return;
    const listeners = this.eventListeners.get(type);
    if (!listeners) return;
    if (comIdentification) {
      listeners.delete(comIdentification);
    } else {
      this.eventListeners.delete(type);
    }
  }

  emitEvent(command: Command) {
    const event = command.event;
    const data = Command.encode(command).finish();
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('message', data);
        console.log(`[客户端 ${this.windowId}] 发送事件: ${event}`);
      } catch (error) {
        console.error(`[客户端 ${this.windowId}] 发送数据出错:`, error);
        this._queueMessage(command);
      }
    } else {
      this._queueMessage(command);
    }
  }

  /** 发送消息队列 */
  private _queueMessage(command: Command) {
    const event = command.event as SocketProtoEventType;
    const existingIndex = this.sendQueue.findIndex((q) => q.event === event);
    if (existingIndex > -1) {
      this.sendQueue[existingIndex] = { event, data: command };
    } else {
      this.sendQueue.push({ event, data: command });
    }
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

  private sendToRenderer(channel: string, data?: unknown): void {
    if (!this.mainWindow?.webContents || this.mainWindow.isDestroyed()) {
      logger.warn('[Socket] Cannot send to renderer: window not available');
      return;
    }
    this.mainWindow.webContents.send(channel, data);
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
}

export const socketService = SocketService.getInstance();
