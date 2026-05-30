import { io } from 'socket.io-client';
import { SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { ClientToServiceEvent, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import { MessageRegistry } from './messageRegistry';
import type { CChatSocket } from './types';
import type { IdentityProvider } from '../adapters/identityProvider';
import type { TokenProvider } from '../adapters/tokenProvider';
import type { RequestContext } from '../adapters/requestContext';
import type { ConnectionObserver } from '../adapters/connectionObserver';

export interface RealtimeClientOptions {
  url: string;
  tokenProvider: TokenProvider;
  identityProvider: IdentityProvider;
  /** 透传给 tokenProvider.getToken 的上下文（Electron 用 { windowId }） */
  context?: RequestContext | null;
  observer?: ConnectionObserver;
  /** 日志前缀（Electron 用 windowId） */
  name?: string | number;
}

/**
 * 平台无关的 socket.io 实时客户端：负责连接生命周期（连接/心跳/重连/销毁），
 * 业务事件由外层通过 `subscribeToEvent` 注册。
 */
export class RealtimeClient extends MessageRegistry {
  private socket: CChatSocket | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private accessToken: string | null = null;

  private pingTimerId?: ReturnType<typeof setTimeout>;
  private reconnectTimerId?: ReturnType<typeof setTimeout>;
  private isReconnecting = false;

  private readonly tokenProvider: TokenProvider;
  private readonly context: RequestContext | null;
  private readonly observer?: ConnectionObserver;
  private readonly url: string;

  // 30s连接超时
  private readonly AUTH_TIMEOUT = 30000;
  // 10秒ping一次
  private readonly PING_INTERVAL = 10000;
  // 5秒ping超时
  private readonly PING_TIMEOUT = 5000;
  // 固定重连延迟 5秒
  private readonly RECONNECT_DELAY = 5000;

  constructor(options: RealtimeClientOptions) {
    super(options.identityProvider, String(options.name ?? ''));
    this.tokenProvider = options.tokenProvider;
    this.context = options.context ?? null;
    this.observer = options.observer;
    this.url = options.url;
  }

  /** 当前 socket 是否已连接 */
  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  async connect(url: string = this.url) {
    this.destroy();
    console.log(`[Socket ${this.logName}] Connecting to ${url}`);

    if (!this.accessToken) {
      const accessToken = await this.tokenProvider.getToken(this.context);
      if (!accessToken) {
        const error = new Error('No access token found');
        console.error(`[Socket ${this.logName}] ${error.message}`);
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

    const timeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        console.error(`[Socket ${this.logName}] Initial connection timeout`);
        this.handleConnectError(new Error('Connection timeout'));
        return;
      }
    }, this.AUTH_TIMEOUT);

    /** 连接成功 */
    this.socket.on('connect', () => {
      if (timeout) clearTimeout(timeout);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      console.log(`[Socket ${this.logName}] 连接成功. ID: ${this.socket?.id}`);
      this.setupPingTimer();

      this.subscribeToEvent(ServiceToClientEvent.pong, () => {
        console.log(`[客户端 ${this.logName}] 收到 ${ServiceToClientEvent.pong}`);
        this.cancelPendingReconnect();
      });
      if (this.socket) {
        this._processQueue(this.socket);
      }
    });

    /** 断开连接 */
    this.socket.on('disconnect', (reason) => {
      this.rejectAllWaiters(new Error(`Socket 断开: ${reason}`));
      console.warn(`[Socket ${this.logName}] Disconnected: ${reason}`);
      this.observer?.onDisconnected?.(reason);

      /** 非主动断开时尝试重连 */
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    /** 连接错误 */
    this.socket.on('connect_error', (error) => {
      console.error(`[Socket ${this.logName}] Connect error: ${error.message}`);
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

    console.log(`[客户端 ${this.logName}] Ping失败重连，延迟${this.RECONNECT_DELAY}ms`);

    this.reconnectTimerId = setTimeout(() => {
      if (this.isReconnecting) return;
      console.log(`[客户端 ${this.logName}] 开始Ping失败重连`);
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
      console.error(`[Socket ${this.logName}] Max reconnection attempts reached. Giving up.`);
      this.observer?.onError?.({
        errorCode: SOCKET_ERROR_CODE.UNKNOWN,
        errorMessage: 'Failed to reconnect after multiple attempts',
      });
      return;
    }
    this.isReconnecting = true;

    const delay = this.RECONNECT_DELAY * (this.reconnectAttempts + 1);
    this.reconnectAttempts++;

    console.log(
      `[Socket ${this.logName}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );
    this.observer?.onReconnecting?.({
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
    this.observer?.onError?.({
      errorCode: SOCKET_ERROR_CODE.INTERNAL_ERROR,
      errorMessage: error.message,
    });

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // ==================== 生命周期管理 ====================
  /** 安全断开（保留实例） */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log(`[Socket ${this.logName}] Disconnected manually`);
    }
  }

  /** 彻底销毁（窗口关闭时调用） */
  public destroy(): void {
    this.rejectAllWaiters(new Error('Socket 已销毁'));
    if (!this.socket) return;

    this.disconnect();

    this.socket.offAny();
    this.socket = null;

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
    console.log(`[Socket ${this.logName}] Service destroyed`);
  }

  protected getSocket(): CChatSocket | null {
    return this.socket;
  }
}
