import { io, Socket } from 'socket.io-client';
import { PORTS } from '@c_chat/shared-config';
import { Command } from '@c_chat/shared-protobuf';
import {
  ClientToServiceEvent,
  ServiceToClientEvent,
  clientDecodeProtoMap,
  type ClientDecodeProtoMapKey,
} from '@c_chat/shared-protobuf/protoMap';
import { StoreDB } from '../db';

export interface ServerToClientEvents {
  message: (data: Uint8Array) => void;
  auth_error: (data: { message: string; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  message: (data: Uint8Array<ArrayBufferLike>) => void;
}

export type CChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class SocketService {
  private socket: CChatSocket | null = null;
  private accessToken: string | null = null;
  private userId: string | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();

  private pingTimerId?: NodeJS.Timeout;
  private readonly PING_INTERVAL = 10000;
  private readonly REQUEST_TIMEOUT = 30000;

  private static instance: SocketService | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  async connect(token: string, userId: string): Promise<void> {
    this.accessToken = token;
    this.userId = userId;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${PORTS.SERVICE}/chat`;

    return new Promise((resolve, reject) => {
      this.socket = io(socketUrl, {
        transports: ['websocket'],
        auth: { token: this.accessToken },
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected:', this.socket?.id);
        this.startPing();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connect error:', error);
        reject(error);
      });

      this.socket.on('auth_error', (data) => {
        console.error('[Socket] Auth error:', data);
        this.disconnect();
        reject(new Error(data.message));
      });

      this.socket.on('message', (data: Uint8Array) => {
        this.handleMessage(data);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        this.stopPing();
      });
    });
  }

  disconnect(): void {
    this.stopPing();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.pendingRequests.forEach((req) => {
      clearTimeout(req.timeout);
      req.reject(new Error('Socket disconnected'));
    });
    this.pendingRequests.clear();
    this.eventListeners.clear();
    this.accessToken = null;
    this.userId = null;
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimerId = setInterval(() => {
      if (this.isConnected()) {
        this.sendEvent(ClientToServiceEvent.ping, null);
      }
    }, this.PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimerId) {
      clearInterval(this.pingTimerId);
      this.pingTimerId = undefined;
    }
  }

  private handleMessage(data: Uint8Array): void {
    try {
      const command = Command.decode(data);

      const event = command.event as ClientDecodeProtoMapKey;
      const protoClass = clientDecodeProtoMap[event];

      let payload: unknown = null;
      if (protoClass && command.payload && command.payload.length > 0) {
        payload = protoClass.decode(command.payload[0]);
      }

      console.log('[Socket] Received:', event, payload);

      // 处理请求/响应配对
      if (command.requestId && this.pendingRequests.has(command.requestId)) {
        const pending = this.pendingRequests.get(command.requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(command.requestId);

        if (event === ServiceToClientEvent.error) {
          pending.reject(new Error(this.getErrorMessage(payload)));
        } else {
          pending.resolve(payload);
        }
      }

      // 触发事件监听器
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach((listener) => listener(payload));
      }
    } catch (error) {
      console.error('[Socket] Handle message error:', error);
    }
  }

  private sendEvent(event: string, payload: Uint8Array | null): string {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Socket not connected');
    }

    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const command = Command.create({
      event,
      userId: this.userId || '',
      client: 'web',
      requestId,
      payload: payload ? [payload] : [],
    });

    const buffer = Command.encode(command).finish();
    this.socket.emit('message', buffer);

    return requestId;
  }

  async request<T>(event: string, payload: Uint8Array | null): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        const requestId = this.sendEvent(event, payload);

        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${event}`));
        }, this.REQUEST_TIMEOUT);

        this.pendingRequests.set(requestId, {
          resolve: (data) => resolve(data as T),
          reject,
          timeout,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  on<T>(event: string, listener: (data: T) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as (data: unknown) => void);
  }

  off<T>(event: string, listener: (data: T) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener as (data: unknown) => void);
    }
  }

  private getErrorMessage(payload: unknown): string {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = payload.message;
      if (typeof message === 'string') return message;
    }
    return 'Unknown error';
  }
}

export const socketService = SocketService.getInstance();
