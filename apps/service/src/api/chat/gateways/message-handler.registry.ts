import { Command, ErrorResult } from '@c_chat/shared-protobuf';
import {
  ClientDecodeProtoMapKey,
  ServiceDecodeProtoCallback,
  serviceDecodeProtoMap,
  ServiceDecodeProtoMapKey,
  ServiceToClientEvent,
} from '@c_chat/shared-protobuf/protoMap';
import { SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { Server, Socket } from 'socket.io';
import { ChatSocket } from 'src/types/socket.types';

export const getUserRoom = (userId: string) => `user:${userId}`;

type Handler<K extends keyof ServiceDecodeProtoCallback> = (
  client: ChatSocket,
  payload: Parameters<ServiceDecodeProtoCallback[K]>[0],
  requestId?: string,
) => void | Promise<void>;

interface HandlerMap {
  get<K extends keyof ServiceDecodeProtoCallback>(event: K): Handler<K> | undefined;
  set<K extends keyof ServiceDecodeProtoCallback>(event: K, handler: Handler<K>): this;
}

export abstract class MessageHandlerRegistry {
  public abstract server: Server;
  protected abstract userSockets: Map<string, Set<string>>;

  protected readonly handlers = new Map() as HandlerMap;

  protected abstract initializeHandlers(): void;

  public dispatch(command: Command, client: ChatSocket) {
    const event = command.event as ServiceDecodeProtoMapKey;
    const handler = this.handlers.get(event);

    if (!handler) {
      console.warn(`No handler found for event: ${command.event}`);
      return;
    }

    const decodedResult = this.decodePayload(event, command);
    return handler(client, decodedResult, command.requestId);
  }

  private decodePayload<K extends ServiceDecodeProtoMapKey>(
    event: K,
    command: Command,
  ): Parameters<ServiceDecodeProtoCallback[K]>[0] {
    const clazz = serviceDecodeProtoMap[event];
    if (!clazz) {
      return null as Parameters<ServiceDecodeProtoCallback[K]>[0];
    }

    return clazz.decode(command.payload[0]) as Parameters<ServiceDecodeProtoCallback[K]>[0];
  }

  sendMessageToClient(
    socketClient: ChatSocket,
    event: ClientDecodeProtoMapKey,
    payload?: Uint8Array | Uint8Array[],
    requestId?: string,
  ) {
    const sendCommand = Command.create({
      event,
      userId: socketClient.data.user?.id,
      payload: payload ? (Array.isArray(payload) ? payload : [payload]) : undefined,
      requestId,
    });
    const responseBuffer = Command.encode(sendCommand).finish();
    socketClient.emit('message', responseBuffer);
  }

  sendErrorMessageToClient(
    socketClient: ChatSocket,
    errorResult: Pick<ErrorResult, 'errorCode' | 'errorMessage'>,
  ) {
    const { errorCode = SOCKET_ERROR_CODE.INTERNAL_ERROR, errorMessage = 'Unknown error' } =
      errorResult;

    this.sendMessageToClient(
      socketClient,
      ServiceToClientEvent.error,
      ErrorResult.encode(ErrorResult.create({ errorCode, errorMessage })).finish(),
    );
  }

  broadcastToRoom(
    roomId: string,
    event: ClientDecodeProtoMapKey,
    payload: Uint8Array | Uint8Array[],
    senderId?: string,
    exceptSocketId?: string,
  ) {
    const sendCommand = Command.create({
      event,
      userId: senderId,
      payload: Array.isArray(payload) ? payload : [payload],
    });
    const responseBuffer = Command.encode(sendCommand).finish();
    if (exceptSocketId) {
      this.server.to(roomId).except(exceptSocketId).emit('message', responseBuffer);
    } else {
      this.server.to(roomId).emit('message', responseBuffer);
    }
  }

  protected async joinUserToRoom(server: Server, userIds: string[], roomId: string) {
    if (!server) return;
    const sockets = server.sockets as unknown as Map<string, Socket>;
    const joins: Promise<unknown>[] = [];

    for (const userId of userIds) {
      const socketIds = this.userSockets.get(userId);
      if (!socketIds) continue;
      for (const socketId of socketIds) {
        const socket = sockets.get(socketId);
        if (socket) {
          joins.push(Promise.resolve(socket.join(roomId)));
        }
      }
    }

    await Promise.all(joins);
  }

  protected sendMessageToUser(
    userId: string,
    event: ClientDecodeProtoMapKey,
    payload: Uint8Array | Uint8Array[],
    senderId?: string,
  ) {
    const sendCommand = Command.create({
      event,
      userId: senderId,
      payload: Array.isArray(payload) ? payload : [payload],
    });
    const responseBuffer = Command.encode(sendCommand).finish();

    this.server.to(getUserRoom(userId)).emit('message', responseBuffer);
  }
}
