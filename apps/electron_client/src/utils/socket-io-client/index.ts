import logger from '../logger';
import { storeTableClass } from '@c_chat/electron_client/db';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { RealtimeClient, type ConnectionObserver } from '@c_chat/shared-api';
import { electronTokenProvider } from '../axios/adapters/electronTokenProvider';
import { createElectronIdentityProvider } from './adapters/electronIdentityProvider';
import { registerSocketEventHandlers, sendToRenderer } from './message.handler';

export type { ServerToClientEvents, ClientToServerEvents, CChatSocket } from '@c_chat/shared-api';

/**
 * Socket服务类 - 每个窗口独立的socket连接。
 * 组合 shared-api 的 RealtimeClient，注入 electron 平台适配器，并注册业务事件处理器。
 */
export class SocketService {
  private readonly client: RealtimeClient;

  constructor(private windowId: number) {
    const observer: ConnectionObserver = {
      onDisconnected: (reason) =>
        sendToRenderer(this.windowId, ELECTRON_TO_CLIENT_CHANNELS.SocketDisconnected, reason),
      onReconnecting: (info) =>
        sendToRenderer(this.windowId, ELECTRON_TO_CLIENT_CHANNELS.SocketReconnecting, info),
      onError: (error) => sendToRenderer(this.windowId, ELECTRON_TO_CLIENT_CHANNELS.ERROR, error),
    };

    this.client = new RealtimeClient({
      url: process.env.SOCKET_URL || 'http://localhost:3001/chat',
      tokenProvider: electronTokenProvider,
      identityProvider: createElectronIdentityProvider(windowId),
      context: { windowId },
      observer,
      name: windowId,
    });

    registerSocketEventHandlers(this.client, windowId);
  }

  async init() {
    logger.info(`[Socket ${this.windowId}] init`);
    await this.client.connect();
  }

  public isConnected(): boolean {
    return this.client.isConnected();
  }

  public getUserInfo() {
    return storeTableClass.getUserInfo(this.windowId);
  }

  public genericRequest: RealtimeClient['genericRequest'] = (...args) =>
    this.client.genericRequest(...args);

  public disconnect(): void {
    this.client.disconnect();
  }

  public destroy(): void {
    this.client.destroy();
    logger.info(`[Socket ${this.windowId}] Service destroyed`);
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

  /**
   * 检查指定窗口的 socket 是否处于已连接状态
   * @param windowId 窗口ID
   */
  public isConnected(windowId: number): boolean {
    const svc = this.sockets.get(windowId);
    if (!svc) return false;
    return svc.isConnected();
  }
}

export const socketManager = SocketManager.getInstance();
