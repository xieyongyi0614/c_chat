import { Command, ErrorResult } from '@c_chat/shared-protobuf';
import {
  ClientDecodeProtoMapKey,
  serviceDecodeProtoMap,
  ServiceDecodeProtoMapKey,
  ServiceToClientEvent,
} from '@c_chat/shared-protobuf/protoMap';
import { ChatSocket } from 'src/types/socket.types';
import { Server, Socket } from 'socket.io';
import { SOCKET_ERROR_CODE } from 'src/constants/errorCode';

/** 消息命令处理器注册中心 */
export abstract class MessageHandlerRegistry {
  public abstract server: Server;
  protected abstract userSockets: Map<string, Set<string>>;

  protected readonly handlers = new Map<
    ServiceDecodeProtoMapKey,
    (client: ChatSocket, payload?: unknown, requestId?: string) => void | Promise<void>
  >();

  protected abstract initializeHandlers(): void;

  public dispatch(command: Command, client: ChatSocket) {
    const event = command.event as ServiceDecodeProtoMapKey;
    const handler = this.handlers.get(event);

    if (!handler) {
      console.warn(`⚠️ 未找到事件处理器: ${command.event}`, this.handlers);
      return;
    }
    const clazz = serviceDecodeProtoMap[event];
    const decodedResult = clazz?.decode(command.payload[0]);
    if (decodedResult) {
      console.log(
        '============================处理订阅广播========================================',
      );
      console.log(`收到消息：Event=${event},requestId=${command.requestId}`);
      console.log(decodedResult);
      console.log(
        '============================处理订阅广播========================================',
      );
    }

    // 这里可以根据 event 类型自动解码 body，或者交给 handler 自己解
    // 为了灵活性，这里直接把整个 command 传进去，或者只传 body
    // 假设我们传解码后的 body (需要根据你的逻辑调整)

    return handler(client, decodedResult, command.requestId);
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
    console.log('✅ 已发送到客户端', sendCommand);
  }
  sendErrorMessageToClient(
    socketClient: ChatSocket,
    errorResult: Pick<ErrorResult, 'errorCode' | 'errorMessage'>,
  ) {
    const {
      errorCode = SOCKET_ERROR_CODE.INTERNAL_ERROR,
      errorMessage = '未知错误，请联系管理员',
    } = errorResult;

    this.sendMessageToClient(
      socketClient,
      ServiceToClientEvent.error,
      ErrorResult.encode(ErrorResult.create({ errorCode, errorMessage })).finish(),
    );
  }

  /**
   * 广播消息到指定房间
   */
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

    console.log(`✅ 已广播到房间 ${roomId}`, sendCommand);
  }

  /**
   * 将多个用户的所有连接加入指定 Socket.io 房间
   */
  protected async joinUserToRoom(server: Server, userIds: string[], roomId: string) {
    for (const userId of userIds) {
      const socketIds = this.userSockets.get(userId);
      if (socketIds && server) {
        for (const socketId of socketIds) {
          const socket = (server.sockets as unknown as Map<string, Socket>).get(socketId);
          if (socket) {
            await socket.join(roomId);
            console.log(`Socket ${socketId} (User: ${userId}) joined room ${roomId}`);
          }
        }
      }
    }
  }

  protected sendMessageToUser(
    userId: string,
    event: ClientDecodeProtoMapKey,
    payload: Uint8Array | Uint8Array[],
    senderId?: string,
  ) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds?.size) {
      return;
    }

    const sendCommand = Command.create({
      event,
      userId: senderId,
      payload: Array.isArray(payload) ? payload : [payload],
    });
    const responseBuffer = Command.encode(sendCommand).finish();

    for (const socketId of socketIds) {
      this.server.to(socketId).emit('message', responseBuffer);
    }
  }
}
