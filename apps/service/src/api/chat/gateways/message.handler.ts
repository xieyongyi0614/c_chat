import { Injectable } from '@nestjs/common';
import { MessageHandlerRegistry } from './message-handler.registry';
import { ClientToServiceEvent, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import { ChatSocket } from 'src/types/socket.types';
import { UsersService } from 'src/api/web/users/users.service';
import { PrismaService } from 'src/core/database';
import {
  GetUserList,
  GetUserListResponse,
  ConversationInfo,
  SendMessageRequest,
  MessageInfo,
  GetConversationListRequest,
  GetConversationListResponse,
  GetMessageHistoryRequest,
  GetMessageHistoryResponse,
  ReadMessageRequest,
  ReadMessageResponse,
  AckSendMessage,
  NewUpdateMessage,
  IConversationInfo,
  CreateGroupRequest,
  CreateGroupResponse,
  GroupInfo,
  GetGroupDetailRequest,
  GetGroupDetailResponse,
  GroupOperationResponse,
  UpdateGroupRequest,
  InviteGroupMembersRequest,
  LeaveGroupRequest,
  DismissGroupRequest,
} from '@c_chat/shared-protobuf';
import { buildMessageInfoPayload } from '../utils/message-to-proto.util';
import { MessageService } from '../services/message.service';
import { ChatService } from '../services/chat.service';
import { Server } from 'socket.io';
import { RequestListParams } from 'src/common';
import { transformPaginationParams } from 'src/utils';
import { ConversationType } from '@c_chat/shared-types';

@Injectable()
export abstract class MessageHandler extends MessageHandlerRegistry {
  public abstract server: Server;
  protected abstract userSockets: Map<string, Set<string>>;

  constructor(
    private userService: UsersService,
    protected messageService: MessageService,
    protected chatService: ChatService,
    protected prisma: PrismaService,
  ) {
    super();
  }

  onModuleInit() {
    this.initializeHandlers();
  }
  /** 初始化消息处理器 */
  protected initializeHandlers(): void {
    this.handlers.set(ClientToServiceEvent.ping, (client) => this.handlePing(client));
    this.handlers.set(ClientToServiceEvent.getUserList, this.handleGetUserList);
    // this.handlers.set(ClientToServiceEvent.createConversation, this.handleCreateConversation);
    this.handlers.set(ClientToServiceEvent.sendMessage, this.handleSendMessage);
    this.handlers.set(ClientToServiceEvent.getConversationList, this.handleGetConversationList);
    this.handlers.set(ClientToServiceEvent.getMessageHistory, this.handleGetMessageHistory);
    this.handlers.set(ClientToServiceEvent.readMessage, this.handleReadMessage);
    this.handlers.set(ClientToServiceEvent.createGroup, this.handleCreateGroup);
    this.handlers.set(ClientToServiceEvent.getGroupDetail, this.handleGetGroupDetail);
    this.handlers.set(ClientToServiceEvent.updateGroup, this.handleUpdateGroup);
    this.handlers.set(ClientToServiceEvent.inviteGroupMembers, this.handleInviteGroupMembers);
    this.handlers.set(ClientToServiceEvent.leaveGroup, this.handleLeaveGroup);
    this.handlers.set(ClientToServiceEvent.dismissGroup, this.handleDismissGroup);
  }

  private handlePing(client: ChatSocket) {
    this.sendMessageToClient(client, ServiceToClientEvent.pong);
  }

  private getListSearchDto(params?: RequestListParams | null) {
    const pagination = params?.pagination;
    return {
      page: pagination?.page != null ? Number(pagination.page) : 1,
      pageSize: pagination?.pageSize != null ? Number(pagination.pageSize) : 10,
      word: params?.word || '',
    };
  }

  private handleGetUserList = async (
    client: ChatSocket,
    payload?: GetUserList | null,
    requestId?: string,
  ) => {
    const search = this.getListSearchDto(payload as RequestListParams);
    const { list, ...rest } = await this.userService.list({
      ...search,
      excludeUserId: client.data.user.id,
    });

    const response = GetUserListResponse.encode(
      GetUserListResponse.create({
        pagination: rest,
        list: list.map((user) => ({ ...user, updateTime: user.updateTime.getTime() })),
      }),
    ).finish();
    this.sendMessageToClient(client, ServiceToClientEvent.getUserListResponse, response, requestId);
  };

  private buildGroupInfo(group: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    notice?: string | null;
    ownerId: string;
    state: number;
    updateTime: Date;
    createTime: Date;
  }) {
    return GroupInfo.create({
      id: group.id,
      name: group.name,
      avatarUrl: group.avatarUrl ?? undefined,
      notice: group.notice ?? undefined,
      ownerId: group.ownerId,
      state: group.state,
      updateTime: group.updateTime.getTime(),
      createTime: group.createTime.getTime(),
    });
  }

  private buildGroupConversationInfo(
    conversation: {
      id: string;
      type: number;
      lastMsgContent?: string | null;
      lastMsgTime?: Date | null;
      updateTime: Date;
      createTime: Date;
      unreadCount?: number | null;
      lastReadSeq?: bigint | null;
    },
    group: { id: string; name: string; avatarUrl?: string | null },
  ) {
    return ConversationInfo.create({
      id: conversation.id,
      type: conversation.type,
      lastMsgContent: conversation.lastMsgContent ?? undefined,
      lastMsgTime: conversation.lastMsgTime ? conversation.lastMsgTime.getTime() : undefined,
      updateTime: conversation.updateTime.getTime(),
      createTime: conversation.createTime.getTime(),
      unreadCount: conversation.unreadCount ?? 0,
      lastReadSeq: String(conversation.lastReadSeq ?? 0n),
      targetInfo: {
        id: group.id,
        name: group.name,
        avatarUrl: group.avatarUrl ?? '',
      },
    });
  }

  private buildGroupOperationResponse(payload: {
    success: boolean;
    group?: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      notice?: string | null;
      ownerId: string;
      state: number;
      updateTime: Date;
      createTime: Date;
    } | null;
    conversation?: {
      id: string;
      type: number;
      lastMsgContent?: string | null;
      lastMsgTime?: Date | null;
      updateTime: Date;
      createTime: Date;
      unreadCount?: number | null;
      lastReadSeq?: bigint | null;
    } | null;
  }) {
    return GroupOperationResponse.create({
      success: payload.success,
      group: payload.group ? this.buildGroupInfo(payload.group) : undefined,
      conversation:
        payload.group && payload.conversation
          ? this.buildGroupConversationInfo(payload.conversation, {
              id: payload.group.id,
              name: payload.group.name,
              avatarUrl: payload.group.avatarUrl ?? '',
            })
          : undefined,
    });
  }

  private handleCreateGroup = async (
    client: ChatSocket,
    payload?: CreateGroupRequest | null,
    requestId?: string,
  ) => {
    const ownerId = client.data.user?.id;
    if (!ownerId || !payload) return;

    const result = await this.chatService.createGroup(
      ownerId,
      payload.name,
      payload.memberIds ?? [],
      payload.avatarUrl ?? undefined,
    );
    await this.joinUserToRoom(this.server, result.memberIds, result.conversation.id);

    const conversation = this.buildGroupConversationInfo(result.conversation, result.group);
    const response = CreateGroupResponse.encode(
      CreateGroupResponse.create({
        group: this.buildGroupInfo(result.group),
        conversation,
      }),
    ).finish();

    this.sendMessageToClient(client, ServiceToClientEvent.createGroupResponse, response, requestId);

    const update = this.buildNewUpdateMessage([], [conversation]);
    result.memberIds
      .filter((memberId) => memberId !== ownerId)
      .forEach((memberId) =>
        this.sendMessageToUser(memberId, ServiceToClientEvent.newUpdateMessage, update, ownerId),
      );
  };

  private handleGetGroupDetail = async (
    client: ChatSocket,
    payload?: GetGroupDetailRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.groupId) return;

    const group = await this.chatService.getGroupDetail(payload.groupId, userId);
    const response = GetGroupDetailResponse.encode(
      GetGroupDetailResponse.create({
        group: this.buildGroupInfo(group),
        members: group.members.map((member) => ({
          userId: member.userId,
          nickname: member.alias || member.user.nickname || member.user.email || '',
          avatarUrl: member.user.avatarUrl ?? undefined,
          role: member.role,
          alias: member.alias ?? undefined,
          state: member.state,
        })),
      }),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.getGroupDetailResponse,
      response,
      requestId,
    );
  };

  private handleUpdateGroup = async (
    client: ChatSocket,
    payload?: UpdateGroupRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.groupId) return;

    const result = await this.chatService.updateGroup(userId, payload.groupId, {
      name: payload.name ?? undefined,
      avatarUrl: payload.avatarUrl ?? undefined,
      notice: payload.notice ?? undefined,
    });

    const response = GroupOperationResponse.encode(
      this.buildGroupOperationResponse({
        success: true,
        group: result.group,
        conversation: result.conversation,
      }),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.groupOperationResponse,
      response,
      requestId,
    );

    const conversation = this.buildGroupConversationInfo(result.conversation, result.group);
    this.broadcastToRoom(
      result.conversation.id,
      ServiceToClientEvent.newUpdateMessage,
      this.buildNewUpdateMessage([], [conversation]),
      userId,
    );
  };

  private handleInviteGroupMembers = async (
    client: ChatSocket,
    payload?: InviteGroupMembersRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.groupId) return;

    const result = await this.chatService.inviteGroupMembers(
      userId,
      payload.groupId,
      payload.memberIds ?? [],
    );

    await this.joinUserToRoom(this.server, result.memberIds, result.conversation.id);

    const response = GroupOperationResponse.encode(
      this.buildGroupOperationResponse({
        success: true,
        group: result.group,
        conversation: result.conversation,
      }),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.groupOperationResponse,
      response,
      requestId,
    );

    const conversation = this.buildGroupConversationInfo(result.conversation, result.group);
    this.broadcastToRoom(
      result.conversation.id,
      ServiceToClientEvent.newUpdateMessage,
      this.buildNewUpdateMessage([], [conversation]),
      userId,
    );
  };

  private handleLeaveGroup = async (
    client: ChatSocket,
    payload?: LeaveGroupRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.groupId) return;

    const result = await this.chatService.leaveGroup(userId, payload.groupId);
    const response = GroupOperationResponse.encode(
      this.buildGroupOperationResponse({
        success: true,
        group: result.group,
        conversation: result.conversation,
      }),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.groupOperationResponse,
      response,
      requestId,
    );

    this.sendMessageToUser(
      userId,
      ServiceToClientEvent.newUpdateMessage,
      this.buildNewUpdateMessage([], [], [result.conversation.id]),
      userId,
    );
  };

  private handleDismissGroup = async (
    client: ChatSocket,
    payload?: DismissGroupRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.groupId) return;

    const result = await this.chatService.dismissGroup(userId, payload.groupId);
    const response = GroupOperationResponse.encode(
      this.buildGroupOperationResponse({
        success: true,
        group: result.group,
        conversation: result.conversation,
      }),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.groupOperationResponse,
      response,
      requestId,
    );

    this.broadcastToRoom(
      result.conversation.id,
      ServiceToClientEvent.newUpdateMessage,
      this.buildNewUpdateMessage([], [], [result.conversation.id]),
      userId,
    );
  };

  /**
   * 获取会话列表
   */
  private handleGetConversationList = async (
    client: ChatSocket,
    payload?: GetConversationListRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId) return;

    const { page, pageSize } = transformPaginationParams(payload?.pagination);

    const { list, total } = await this.chatService.getUserConversations(userId, page, pageSize);

    const encodedList = list.map((c) =>
      ConversationInfo.create({
        id: c.id,
        type: c.type,
        lastMsgContent: c.lastMsgContent ?? undefined,
        lastMsgTime: c.lastMsgTime ? new Date(c.lastMsgTime).getTime() : undefined,
        updateTime: c.updateTime.getTime(),
        createTime: c.createTime.getTime(),
        unreadCount: c.unreadCount ?? 0,
        lastReadSeq: String(c.lastReadSeq ?? 0n),
        targetInfo: {
          id: c.targetId ?? '',
          name: c.conversationName,
          avatarUrl: c.conversationAvatar ?? '',
        },
      }),
    );

    const responseData = {
      pagination: {
        total,
        page,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
      },
      list: encodedList ?? [],
    };

    const response = GetConversationListResponse.encode(
      GetConversationListResponse.create(responseData),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.getConversationListResponse,
      response,
      requestId,
    );
  };

  /**
   * 获取消息历史
   */
  private handleGetMessageHistory = async (
    client: ChatSocket,
    payload?: GetMessageHistoryRequest | null,
    requestId?: string,
  ) => {
    if (!payload?.conversationId) return;
    const { page, pageSize } = transformPaginationParams(payload.pagination);

    const afterMsgId = Number(payload.afterMsgId ?? 0);
    const beforeMsgId = Number(payload.beforeMsgId ?? 0);
    const limit = Number(payload.limit || pageSize);
    const hasMsgIdCursor = afterMsgId > 0 || beforeMsgId > 0;
    const result = hasMsgIdCursor
      ? await this.messageService.getConversationMessagesByMsgIdRange(payload.conversationId, {
          afterMsgId,
          beforeMsgId,
          limit,
        })
      : payload.limit
        ? await this.messageService.getLatestConversationMessages(payload.conversationId, limit)
        : await this.messageService.getConversationMessages(payload.conversationId, page, pageSize);
    const { list, total } = result;

    const encodedList = list.map((m) => MessageInfo.create(buildMessageInfoPayload(m)));

    const response = GetMessageHistoryResponse.encode(
      GetMessageHistoryResponse.create({
        pagination: {
          total,
          page: result.page,
          pageSize: result.pageSize,
          totalPage: Math.ceil(total / result.pageSize),
        },
        list: encodedList,
      }),
    ).finish();

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.getMessageHistoryResponse,
      response,
      requestId,
    );
  };

  /**
   * 标记会话消息已读
   */
  private handleReadMessage = async (
    client: ChatSocket,
    payload?: ReadMessageRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.conversationId) {
      return;
    }

    const result = await this.messageService.markConversationAsRead(
      userId,
      payload.conversationId,
      payload.msgSeq ?? undefined,
    );

    const response = ReadMessageResponse.encode(
      ReadMessageResponse.create({
        conversationId: result.conversationId,
        msgSeq: result.msgSeq,
        unreadCount: result.unreadCount,
      }),
    ).finish();

    this.sendMessageToClient(client, ServiceToClientEvent.ReadMessageResponse, response, requestId);
  };

  private getLastMsgContent(content: string | null | undefined, type: number) {
    if (content?.trim()) {
      return content;
    }

    const typeMap: Record<number, string> = {
      0: '',
      1: '[Image]',
      2: '[Video]',
      3: '[File]',
      4: '[Audio]',
    };

    return typeMap[type] || '[Message]';
  }

  protected async buildConversationUpdatesByUserId(
    conversationId: string,
    message: MessageInfo,
  ): Promise<Map<string, IConversationInfo>> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, isDeleted: false },
      select: {
        conversationId: true,
        userId: true,
        remark: true,
        lastReadSeq: true,
        createTime: true,
        conversation: { select: { type: true, groupId: true } },
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    const conversation = participants[0]?.conversation;
    const group = conversation?.groupId
      ? await this.prisma.group.findUnique({
          where: { id: conversation.groupId },
          select: { id: true, name: true, avatarUrl: true },
        })
      : null;

    const currentSeq = BigInt(message.seq);

    return new Map(
      participants.map((participant) => {
        let targetInfo = {
          id: group?.id ?? '',
          name: group?.name ?? '',
          avatarUrl: group?.avatarUrl ?? '',
        };

        if (participant.conversation.type === ConversationType.Single) {
          const targetUser = participants.find((item) => item.userId !== participant.userId)?.user;
          targetInfo = {
            id: targetUser?.id ?? '',
            name: participant.remark || targetUser?.nickname || targetUser?.id || '',
            avatarUrl: targetUser?.avatarUrl ?? '',
          };
        }

        const unreadCount =
          currentSeq > participant.lastReadSeq ? Number(currentSeq - participant.lastReadSeq) : 0;

        return [
          participant.userId,
          ConversationInfo.create({
            id: participant.conversationId,
            type: participant.conversation.type,
            targetInfo,
            lastMsgContent: this.getLastMsgContent(message.content, message.type),
            lastMsgTime: message.createTime ? Number(message.createTime) : undefined,
            updateTime: message.updateTime ? Number(message.updateTime) : undefined,
            createTime: participant.createTime.getTime(),
            unreadCount,
            lastReadSeq: String(participant.lastReadSeq),
          }),
        ];
      }),
    );
  }

  protected buildNewUpdateMessage(
    messages: MessageInfo[],
    conversations: IConversationInfo[] = [],
    removedConversationIds: string[] = [],
  ) {
    return NewUpdateMessage.encode(
      NewUpdateMessage.create({ messages, conversations, removedConversationIds }),
    ).finish();
  }

  private handleSendMessage = async (
    client: ChatSocket,
    payload?: SendMessageRequest | null,
    requestId?: string,
  ) => {
    const senderId = client.data.user?.id;

    const {
      targetId,
      content,
      fileId,
      type = 0,
      clientMsgId,
      mediaGroupId,
      durationSec,
      waveform,
      thumbUrl,
    } = payload || {};

    let conversationId = payload?.conversationId;
    if (!senderId || (!content && !fileId) || !clientMsgId || (!conversationId && !targetId)) {
      this.sendMessageToClient(
        client,
        ServiceToClientEvent.ackSendMessage,
        AckSendMessage.encode(AckSendMessage.create({ clientMsgId, status: 'fail' })).finish(),
        requestId,
      );
      return;
    }

    this.sendMessageToClient(
      client,
      ServiceToClientEvent.ackSendMessage,
      AckSendMessage.encode(AckSendMessage.create({ clientMsgId, status: 'ok' })).finish(),
      requestId,
    );

    if (!conversationId) {
      try {
        const conversation = await this.chatService.createOrGetPrivateConversation(
          senderId,
          targetId!,
        );
        conversationId = conversation.id;
        if (conversation.isNew && targetId) {
          await this.joinUserToRoom(this.server, [senderId, targetId], conversationId);
        }
      } catch (e) {
        console.log('createOrGetPrivateConversation', e);
        // TODO 创建会话失败处理
        return;
      }
    }

    try {
      await this.chatService.assertCanSendMessage(senderId, conversationId);
    } catch (e) {
      console.log('assertCanSendMessage', e);
      //TODO 无法发送消息处理
      return;
    }

    const message = await this.messageService.sendMessage({
      senderId,
      conversationId,
      content: content ?? '',
      fileId,
      mediaGroupId,
      type,
      clientMsgId,
      durationSec: durationSec ?? undefined,
      waveform,
      thumbUrl: thumbUrl ?? undefined,
    });

    const updateMessage = MessageInfo.create(buildMessageInfoPayload(message));

    const conversationByUserId = await this.buildConversationUpdatesByUserId(
      conversationId,
      updateMessage,
    );

    for (const [userId, conversation] of conversationByUserId) {
      this.sendMessageToUser(
        userId,
        ServiceToClientEvent.newUpdateMessage,
        this.buildNewUpdateMessage([updateMessage], [conversation]),
        senderId,
      );
    }
  };
}
