import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { MessageService } from '../services/message.service';
import { ChatService } from '../services/chat.service';
import { AuthService, WsJwtAuthGuard } from 'src/auth';
import { ChatSocket } from 'src/types/socket.types';
import { Command, MessageInfo, SendFileUploadComplete, UserInfo } from '@c_chat/shared-protobuf';
import { MessageHandler } from './message.handler';
import { UsersService } from 'src/api/web/users/users.service';
import { PrismaService } from 'src/core/database';
import { ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import { FileTypes } from 'src/types/api/file-types';
import { buildMessageInfoPayload, MessageHistoryWithMedia } from '../utils/message-to-proto.util';
import { SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import { getUserRoom } from './message-handler.registry';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'];

      if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
        return callback(null, true);
      }

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
})
@UsePipes(new ValidationPipe())
export class ChatGateway
  extends MessageHandler
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  protected userSockets = new Map<string, Set<string>>();
  protected roomUsers = new Map<string, Set<string>>();

  constructor(
    protected messageService: MessageService,
    protected chatService: ChatService,
    private authService: AuthService,
    userService: UsersService,
    prisma: PrismaService,
  ) {
    super(userService, messageService, chatService, prisma);
  }

  async handleConnection(@ConnectedSocket() client: ChatSocket) {
    try {
      const jwtPayload = await this.authService.authenticateSocket(client);

      client.data.user = jwtPayload;
      const userInfo = await this.authService.validateUser(jwtPayload.id);

      if (!jwtPayload || !jwtPayload.id || !userInfo) {
        throw new WsException('Socket authentication failed');
      }

      if (!this.userSockets.has(userInfo.id)) {
        this.userSockets.set(userInfo.id, new Set());
      }
      this.userSockets.get(userInfo.id)!.add(client.id);
      this.sendMessageToClient(
        client,
        ServiceToClientEvent.getUserInfoResponse,
        UserInfo.encode(
          UserInfo.create({ ...userInfo, updateTime: userInfo.updateTime.getTime() }),
        ).finish(),
      );

      const conversationIds = await this.chatService.getUserConversationIds(userInfo.id);
      await Promise.all([
        client.join(getUserRoom(userInfo.id)),
        ...conversationIds.map((conversationId) => client.join(conversationId)),
      ]);

      this.logger.debug(`User ${userInfo.id} joined ${conversationIds.length} conversations`);
    } catch (error) {
      const errorMessage = (error as Error)?.message;
      this.logger.warn(`Socket authentication failed: ${errorMessage}`, error);
      this.sendErrorMessageToClient(client, {
        errorMessage: 'Authentication failed, please login again',
        errorCode: SOCKET_ERROR_CODE.UNAUTHORIZED,
      });
    }
  }

  handleDisconnect(@ConnectedSocket() client: ChatSocket) {
    const user = client.data.user;
    if (!user || !user.id) {
      return;
    }

    const socketId = client.id;
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.id);
      }
    }

    for (const [roomId, userIds] of this.roomUsers.entries()) {
      if (userIds.has(user.id)) {
        userIds.delete(user.id);
        if (userIds.size === 0) {
          this.roomUsers.delete(roomId);
        }
      }
    }

    this.logger.debug(`User ${user.id} disconnected: ${socketId}`);
  }

  @SubscribeMessage('message')
  @UseGuards(WsJwtAuthGuard)
  async handleProtobufMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() protobufStr: Buffer,
  ) {
    const command = Command.decode(protobufStr);
    await this.dispatch(command, client);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getRoomOnlineCount(roomId: string): number {
    const userIds = this.roomUsers.get(roomId);
    return userIds ? userIds.size : 0;
  }

  notifyUploadComplete(file: FileTypes.FileListItem, uploadId: string) {
    const payload = SendFileUploadComplete.encode(
      SendFileUploadComplete.create({ fileId: file.id, uploadId }),
    ).finish();
    const sendCommand = Command.create({
      event: ServiceToClientEvent.sendFileUploadComplete,
      userId: file.uploaderId,
      payload: [payload],
    });
    const responseBuffer = Command.encode(sendCommand).finish();
    this.server.to(getUserRoom(file.uploaderId)).emit('message', responseBuffer);
    this.logger.debug(`Upload complete: ${uploadId}`);
  }

  async notifyNewUploadMessage(message: MessageHistoryWithMedia) {
    const messagePayload = MessageInfo.create(buildMessageInfoPayload(message));
    const conversationByUserId = await this.buildConversationUpdatesByUserId(
      message.conversationId,
      messagePayload,
    );

    for (const [userId, conversation] of conversationByUserId) {
      const response = this.buildNewUpdateMessage([messagePayload], [conversation]);
      this.sendMessageToUser(
        userId,
        ServiceToClientEvent.newUpdateMessage,
        response,
        message.senderId,
      );
    }
  }
}
