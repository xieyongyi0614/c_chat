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
import { Server } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessageService } from '../services/message.service';
import { ChatService } from '../services/chat.service';
import { AuthService, WsJwtAuthGuard } from 'src/auth';
import { ChatSocket } from 'src/types/socket.types';
import { Command, MessageInfo, SendFileUploadComplete, UserInfo } from '@c_chat/shared-protobuf';
import { MessageHandler } from './message.handler';
import { UsersService } from 'src/api/web/users/users.service';
import { PrismaService } from 'src/core/database';
import { SOCKET_ERROR_CODE } from 'src/constants/errorCode';
import { ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import { FileTypes } from 'src/types/api/file-types';
import { buildMessageInfoPayload, MessageHistoryWithMedia } from '../utils/message-to-proto.util';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    // ✅ 安全方案：从环境变量动态加载允许的源
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'];

      // 允许 Electron 开发环境（仅开发用！）
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
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  // 存储用户 socket 连接映射 (userId -> socketId[])
  protected userSockets = new Map<string, Set<string>>();
  // 存储房间用户映射 (roomId -> Set<userId>)
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

  /**
   * 客户端连接时
   */
  async handleConnection(@ConnectedSocket() client: ChatSocket) {
    try {
      const jwtPayload = await this.authService.authenticateSocket(client);

      client.data.user = jwtPayload;
      const userInfo = await this.authService.validateUser(jwtPayload.id);
      console.log(userInfo, jwtPayload, 'handleConnection');

      if (!jwtPayload || !jwtPayload.id || !userInfo) {
        throw new WsException('连接失败：用户信息缺失');
      }

      // 记录用户 socket 连接
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

      // 获取用户所在的会话并加入 Socket.io 房间
      const conversationIds = await this.chatService.getUserConversationIds(userInfo.id);
      for (const conversationId of conversationIds) {
        await client.join(conversationId);
      }

      this.logger.log(`用户 ${userInfo.id} 已连接并加入 ${conversationIds.length} 个会话房间`);
    } catch (error) {
      const errorMessage = (error as Error)?.message;
      this.logger.warn(`🔐 认证失败: ${errorMessage}`, error);
      this.sendErrorMessageToClient(client, {
        errorMessage: '认证失败，请重新登录',
        errorCode: SOCKET_ERROR_CODE.UNAUTHORIZED,
      });
    }
  }

  /**
   * 客户端断开连接时
   */
  handleDisconnect(@ConnectedSocket() client: ChatSocket) {
    const user = client.data.user;
    if (!user || !user.id) {
      return;
    }

    const socketId = client.id;

    // 从用户 socket 映射中移除
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.id);
      }
    }

    // 从所有房间中移除
    for (const [roomId, userIds] of this.roomUsers.entries()) {
      if (userIds.has(user.id)) {
        userIds.delete(user.id);
        if (userIds.size === 0) {
          this.roomUsers.delete(roomId);
        }
      }
    }

    this.logger.log(`用户 ${user.id} 已断开连接，Socket ID: ${socketId}`);
  }

  /** protobuf 消息处理 */
  @SubscribeMessage('message')
  @UseGuards(WsJwtAuthGuard)
  async handleProtobufMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() protobufStr: Buffer,
  ) {
    const command = Command.decode(protobufStr);
    console.log(`收到请求：Event=${command.event}, User=${JSON.stringify(client.data.user)}`);
    await this.dispatch(command, client);
  }

  /**
   * 获取在线用户列表（可用于管理）
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * 获取房间在线用户数
   */
  getRoomOnlineCount(roomId: string): number {
    const userIds = this.roomUsers.get(roomId);
    return userIds ? userIds.size : 0;
  }

  notifyUploadComplete(file: FileTypes.FileListItem, uploadId: string) {
    const socketIds = this.userSockets.get(file.uploaderId);
    if (socketIds && socketIds.size > 0) {
      for (const sid of socketIds) {
        const payload = SendFileUploadComplete.encode(
          SendFileUploadComplete.create({ fileId: file.id, uploadId }),
        ).finish();

        const sendCommand = Command.create({
          event: ServiceToClientEvent.sendFileUploadComplete,
          userId: file.uploaderId,
          payload: [payload],
        });
        const responseBuffer = Command.encode(sendCommand).finish();
        this.server.to(sid).emit('message', responseBuffer);
      }
    }
    this.logger.log(`上传完成：${uploadId}`);
  }

  async notifyNewUploadMessage(message: MessageHistoryWithMedia) {
    const messagePayload = MessageInfo.create(buildMessageInfoPayload(message));
    const conversationByUserId = await this.buildConversationUpdatesByUserId(
      message.conversationId,
      message.senderId,
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
