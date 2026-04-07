import { storeTableClass } from '@c_chat/electron_client/db';
import initOsData from '../osData';
import {
  clientDecodeProtoMap,
  SOCKET_PROTO_EVENT,
  SocketProtoEventData,
  SocketProtoEventType,
} from '@c_chat/shared-protobuf/protoMap';
import { Command } from '@c_chat/shared-protobuf';
import { Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '.';
import { v4 as uuidv4 } from 'uuid';

type Deferred<T = any> = {
  timer: NodeJS.Timeout;
  event: SocketProtoEventType;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

/** 消息命令处理器注册中心 */
export abstract class MessageHandlerRegistry {
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
    SocketProtoEventType,
    Map<string, (payload: any) => void | Promise<void>>
  >();

  /** 待处理的请求队列 */
  private pendingRequests = new Map<string, Deferred>();
  private static readonly DEFAULT_WAIT_TIMEOUT_MS = 20_000;

  constructor(protected windowId: number) {}

  // protected abstract initializeHandlers(): void;

  protected abstract _queueMessage(command: Command): void;
  protected abstract getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null;

  public dispatch(data: Uint8Array | Buffer) {
    const command = Command.decode(data);
    const event = command.event as SocketProtoEventType;

    // 处理其他事件
    const listener = this.handlers.get(event);
    if (isIgnoreConsoleEvent(event)) {
      console.log(`收到消息：Event=${event},requestId=${command.requestId}`);
    }
    if (listener) {
      if (listener instanceof Map) {
        // 多订阅广播
        listener?.forEach((callback) => {
          try {
            const clazz = clientDecodeProtoMap[event];

            const decodedResult = clazz?.decode(command.payload[0]);

            if (isIgnoreConsoleEvent(event)) {
              console.log(
                '============================处理订阅广播========================================',
              );
              console.log(`反序列化结果`);
              console.log(decodedResult?.toJSON());
              console.log(
                '==========================    end    ========================================',
              );
            }
            this.resolveOrRejectWaiter(command.requestId, decodedResult, null);

            callback(decodedResult);
          } catch (err) {
            console.error(`[客户端 ${this.windowId}] 处理事件${event}出错:`, err);
            console.log(command);
          }
        });
      }
    }
  }

  /** 主动发送消息 */
  protected _sendMessageToService(
    event: SocketProtoEventType,
    payload?: Uint8Array | Uint8Array[],
    requestId?: string,
  ) {
    const osData = initOsData();
    const userInfo = storeTableClass.getUserInfo(this.windowId);

    const command = Command.create({
      event,
      userId: userInfo?.id,
      client: osData.machineId,
      payload: payload ? (Array.isArray(payload) ? payload : [payload]) : undefined,
      requestId,
    });
    const data = Command.encode(command).finish();

    const socket = this.getSocket();
    if (socket && socket.connected) {
      try {
        socket.emit('message', data);
        console.log(`[客户端 ${this.windowId}] 发送事件: ${event}`);
      } catch (error) {
        console.error(`[客户端 ${this.windowId}] 发送数据出错:`, error);
        this._queueMessage(command);
      }
    } else {
      this._queueMessage(command);
    }
  }

  /** 订阅事件 */
  subscribeToEvent<T extends SocketProtoEventType>(
    event: T,
    callback: SocketProtoEventData[T],
    comIdentification?: string,
  ) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Map());
    }
    const listeners = this.handlers.get(event);
    listeners?.set(comIdentification ?? String(event), callback);
    return this.subscribeToEvent;
  }

  /** 取消订阅事件 */
  unsubscribeFromEvent(type: SocketProtoEventType, comIdentification?: string): void {
    const listeners = this.handlers.get(type);
    if (!listeners) return;
    if (comIdentification) {
      listeners.delete(comIdentification);
    } else {
      this.handlers.delete(type);
    }
  }

  /** 请求处理 */
  async genericRequest<TResponse>(
    event: SocketProtoEventType,
    encodedData: Uint8Array,
    requestId: string = uuidv4(),
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      // 创建超时定时器
      const timer = setTimeout(() => {
        const entry = this.pendingRequests.get(requestId);
        if (entry) {
          this.pendingRequests.delete(requestId);
          clearTimeout(entry.timer);
          reject(new Error(`请求 ${requestId} 超时.`));
        }
      }, MessageHandlerRegistry.DEFAULT_WAIT_TIMEOUT_MS);

      const entry: Deferred<TResponse> = { resolve, reject, timer, event };
      this.pendingRequests.set(requestId, entry);

      try {
        this._sendMessageToService(event, encodedData, requestId);
      } catch (e) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  // 5. 通用的解析/拒绝等待项的方法
  private resolveOrRejectWaiter<TResponse>(
    requestId: string,
    response: TResponse | null,
    error: any | null,
  ): void {
    const entry = this.pendingRequests.get(requestId);
    if (!entry) {
      // console.warn(`No waiter found for requestId: ${requestId}. Response might be stale.`);
      return;
    }

    this.pendingRequests.delete(requestId);
    // 清理定时器
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
const isIgnoreConsoleEvent = (event: SocketProtoEventType) => {
  const ignoreEvents: SocketProtoEventType[] = [SOCKET_PROTO_EVENT.ping];
  return !ignoreEvents.includes(event);
};
