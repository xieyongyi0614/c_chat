import {
  clientDecodeProtoMap,
  ClientDecodeProtoMapKey,
  ClientDecodeProtoCallback,
  ClientPaddingRequestsEvent,
  ServiceDecodeProtoMapKey,
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
  reject: (reason?: unknown) => void;
};

interface QueuedEvent {
  event: ClientDecodeProtoMapKey;
  data: Command;
}

type ProtobufMessage = ArrayBuffer | ArrayBufferView;

const toUint8Array = (data: ProtobufMessage): Uint8Array => {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
};

export abstract class MessageRegistry {
  protected readonly handlers = new Map<
    ClientDecodeProtoMapKey,
    Map<string, (data: unknown) => void | Promise<void>>
  >();

  private pendingRequests = new Map<string, Deferred>();
  private static readonly DEFAULT_WAIT_TIMEOUT_MS = 20_000;
  private sendQueue: QueuedEvent[] = [];

  constructor(
    protected identityProvider: IdentityProvider,
    protected logName: string,
  ) {}

  protected abstract getSocket(): CChatSocket | null;

  public dispatch(data: ProtobufMessage) {
    const command = Command.decode(toUint8Array(data));
    const event = command.event as ClientDecodeProtoMapKey;
    const listener = this.handlers.get(event);

    if (listener) {
      listener.forEach((callback) => {
        try {
          const clazz = clientDecodeProtoMap[event];
          const decodedResult = clazz?.decode(command.payload[0]);
          const data = decodedResult?.toJSON() || decodedResult;

          if (command.requestId) {
            this.resolveOrRejectWaiter(command.requestId, data, null);
          }

          callback(data);
        } catch (err) {
          console.error(`[Client ${this.logName}] Failed to handle event ${event}:`, err);
        }
      });
    }
  }

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
      } catch (error) {
        console.error(`[Client ${this.logName}] Failed to send socket data:`, error);
        this._queueMessage(command);
      }
    } else {
      this._queueMessage(command);
    }
  }

  protected _queueMessage(command: Command) {
    const event = command.event as ClientDecodeProtoMapKey;
    const existingIndex = this.sendQueue.findIndex((q) => q.event === event);
    if (existingIndex > -1) {
      this.sendQueue[existingIndex] = { event, data: command };
    } else {
      this.sendQueue.push({ event, data: command });
    }
  }

  protected _processQueue(socket: CChatSocket) {
    while (this.sendQueue.length > 0) {
      const queued = this.sendQueue.shift();
      if (queued) {
        const data = Command.encode(queued.data).finish();
        socket.emit('message', data);
      }
    }
  }

  subscribeToEvent<T extends ClientDecodeProtoMapKey>(
    event: T,
    callback: ClientDecodeProtoCallback[T],
    comIdentification?: string,
  ) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Map());
    }
    const listeners = this.handlers.get(event);
    listeners?.set(comIdentification ?? String(event), callback as (data: unknown) => void);
  }

  unsubscribeFromEvent(type: ClientDecodeProtoMapKey, comIdentification?: string): void {
    const listeners = this.handlers.get(type);
    if (!listeners) return;
    if (comIdentification) {
      listeners.delete(comIdentification);
    } else {
      this.handlers.delete(type);
    }
  }

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
          reject(new globalThis.Error(`Request ${event}: ${requestId} timed out.`));
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
