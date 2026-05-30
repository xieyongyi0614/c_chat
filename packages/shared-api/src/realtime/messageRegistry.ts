import {
  clientDecodeProtoMap,
  ClientDecodeProtoMapKey,
  ClientDecodeProtoCallback,
  ClientPaddingRequestsEvent,
  ServiceDecodeProtoMapKey,
  ServiceToClientEvent,
  ClientPaddingRequestsCallback,
} from '@c_chat/shared-protobuf/protoMap';
import { Command } from '@c_chat/shared-protobuf';
import { uuidv4 } from '@c_chat/shared-utils';
import type { CChatSocket } from './types';
import type { IdentityProvider } from '../adapters/identityProvider';

type Deferred<T = any> = {
  timer: ReturnType<typeof setTimeout>;
  event: ServiceDecodeProtoMapKey;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

interface QueuedEvent {
  event: ClientDecodeProtoMapKey;
  data: Command;
}

/** 消息命令处理器注册中心（传输中立） */
export abstract class MessageRegistry {
  /**
   * 事件监听器注册表
   *
   * 结构说明:
   * - 外层 Map Key (ProtoMapKey 事件名)
   * - 内层 Map (EventListenerMap): 该事件类型下所有订阅者的集合
   *   - Key: 订阅者的唯一标识 (用于精确取消订阅，默认是外层Map Key)
   *   - Value: 具体的回调函数
   */
  protected readonly handlers = new Map<
    ClientDecodeProtoMapKey,
    Map<string, (data: any) => void | Promise<void>>
  >();

  /** 待处理的请求队列 */
  private pendingRequests = new Map<string, Deferred>();
  private static readonly DEFAULT_WAIT_TIMEOUT_MS = 20_000;

  /** 发送消息队列 */
  private sendQueue: QueuedEvent[] = [];

  constructor(
    protected identityProvider: IdentityProvider,
    protected logName: string,
  ) {}

  protected abstract getSocket(): CChatSocket | null;

  public dispatch(data: Uint8Array | Buffer) {
    const command = Command.decode(data);
    const event = command.event as ClientDecodeProtoMapKey;

    const listener = this.handlers.get(event);
    if (isIgnoreConsoleEvent(event)) {
      console.log(`收到消息：Event=${event},requestId=${command.requestId}`);
    }
    if (listener) {
      if (listener instanceof Map) {
        listener?.forEach((callback) => {
          try {
            const clazz = clientDecodeProtoMap[event];
            const decodedResult = clazz?.decode(command.payload[0]);

            if (command.requestId) {
              this.resolveOrRejectWaiter(
                command.requestId,
                decodedResult?.toJSON() || decodedResult,
                null,
              );
            }

            callback(decodedResult?.toJSON() || decodedResult);
          } catch (err) {
            console.error(`[客户端 ${this.logName}] 处理事件${event}出错:`, err);
            console.log(command);
          }
        });
      }
    }
  }

  /** 主动发送消息 */
  protected _sendMessageToService(
    event: ServiceDecodeProtoMapKey,
    payload?: Uint8Array | Uint8Array[],
    requestId?: string,
  ) {
    const { userId, client } = this.identityProvider.getIdentity();

    const command = Command.create({
      event,
      userId,
      client,
      payload: payload ? (Array.isArray(payload) ? payload : [payload]) : undefined,
      requestId,
    });
    const data = Command.encode(command).finish();

    const socket = this.getSocket();
    if (socket && socket.connected) {
      try {
        socket.emit('message', data);
        console.log(`[客户端 ${this.logName}] 发送事件: ${event}`);
      } catch (error) {
        console.error(`[客户端 ${this.logName}] 发送数据出错:`, error);
        this._queueMessage(command);
      }
    } else {
      this._queueMessage(command);
    }
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

  /** 订阅事件 */
  subscribeToEvent<T extends ClientDecodeProtoMapKey>(
    event: T,
    callback: ClientDecodeProtoCallback[T],
    comIdentification?: string,
  ) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Map());
    }
    const listeners = this.handlers.get(event);
    listeners?.set(comIdentification ?? String(event), callback);
  }

  /** 取消订阅事件 */
  unsubscribeFromEvent(type: ClientDecodeProtoMapKey, comIdentification?: string): void {
    const listeners = this.handlers.get(type);
    if (!listeners) return;
    if (comIdentification) {
      listeners.delete(comIdentification);
    } else {
      this.handlers.delete(type);
    }
  }

  /** 请求处理 */
  async genericRequest<T extends keyof typeof ClientPaddingRequestsEvent>(
    event: T,
    encodedData: Uint8Array,
    requestId: string = uuidv4(),
  ) {
    type ResponseType = Parameters<ClientPaddingRequestsCallback[T]>[0];

    return new Promise<ResponseType>((resolve, reject) => {
      const timer = setTimeout(() => {
        const entry = this.pendingRequests.get(requestId);
        if (entry) {
          this.pendingRequests.delete(requestId);
          clearTimeout(entry.timer);
          reject(new globalThis.Error(`请求 ${event}: ${requestId} 超时.`));
        }
      }, MessageRegistry.DEFAULT_WAIT_TIMEOUT_MS);

      const entry: Deferred<ResponseType> = {
        resolve,
        reject,
        timer,
        event,
      };
      this.pendingRequests.set(requestId, entry);

      try {
        this._sendMessageToService(event, encodedData, requestId);
      } catch (e) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timer);
        reject(e instanceof globalThis.Error ? e : new globalThis.Error(String(e)));
      }
    });
  }

  private resolveOrRejectWaiter<TResponse>(
    requestId: string,
    response: TResponse | null,
    error: unknown,
  ): void {
    const entry = this.pendingRequests.get(requestId);
    console.log(`客户端 ${this.logName} 收到响应：${requestId}`);
    if (!entry) {
      return;
    }

    this.pendingRequests.delete(requestId);
    clearTimeout(entry.timer);

    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(response);
    }
  }

  rejectAllWaiters(reason: Error): void {
    for (const entry of this.pendingRequests.values()) {
      clearTimeout(entry.timer);
      entry.reject(reason);
    }
    this.pendingRequests.clear();
  }
}

/** 排除掉一些事件的打印 */
const isIgnoreConsoleEvent = (event: ClientDecodeProtoMapKey) => {
  const ignoreEvents: ClientDecodeProtoMapKey[] = [ServiceToClientEvent.pong];
  return !ignoreEvents.includes(event);
};
