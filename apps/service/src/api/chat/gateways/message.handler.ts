import { ConflictException, Injectable } from '@nestjs/common';
import { MessageHandlerRegistry } from './message-handler.registry';
import {
  ClientDecodeProtoMapKey,
  ClientToServiceEvent,
  ServiceToClientEvent,
} from '@c_chat/shared-protobuf/protoMap';
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
  ITargetInfo,
  CallInviteRequest,
  CallInviteResponse,
  CallIncomingNotify,
  CallAcceptRequest,
  CallRejectRequest,
  CallCancelRequest,
  CallHangupRequest,
  CallEndedNotify,
  CallBusyNotify,
  CallStateSyncNotify,
  CallSdpOffer,
  CallSdpAnswer,
  CallIceCandidate,
  CallIceRestartRequest,
  CallIceRestartNotify,
  CallDeviceStateUpdate,
  CallMuteAudioUpdate,
  CallCameraStateUpdate,
  CallNetworkStateUpdate,
  ICallSignalMeta,
} from '@c_chat/shared-protobuf';
import { buildMessageInfoPayload } from '../utils/message-to-proto.util';
import { MessageService } from '../services/message.service';
import { ChatService } from '../services/chat.service';
import { Server } from 'socket.io';
import { RequestListParams } from 'src/common';
import { transformPaginationParams } from 'src/utils';
import { CallService } from 'src/api/call/call.service';
import { CallSessionState } from '@c_chat/shared-types';

@Injectable()
export abstract class MessageHandler extends MessageHandlerRegistry {
  public abstract server: Server;
  protected abstract userSockets: Map<string, Set<string>>;

  constructor(
    private userService: UsersService,
    protected messageService: MessageService,
    protected chatService: ChatService,
    protected prisma: PrismaService,
    protected callService: CallService,
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
    this.handlers.set(ClientToServiceEvent.callInvite, this.handleCallInvite);
    this.handlers.set(ClientToServiceEvent.callAccept, this.handleCallAccept);
    this.handlers.set(ClientToServiceEvent.callReject, this.handleCallReject);
    this.handlers.set(ClientToServiceEvent.callCancel, this.handleCallCancel);
    this.handlers.set(ClientToServiceEvent.callHangup, this.handleCallHangup);
    this.handlers.set(ClientToServiceEvent.callSdpOffer, this.handleCallSdpOffer);
    this.handlers.set(ClientToServiceEvent.callSdpAnswer, this.handleCallSdpAnswer);
    this.handlers.set(ClientToServiceEvent.callIceCandidate, this.handleCallIceCandidate);
    this.handlers.set(ClientToServiceEvent.callIceRestart, this.handleCallIceRestart);
    this.handlers.set(ClientToServiceEvent.callDeviceStateUpdate, this.handleCallDeviceStateUpdate);
    this.handlers.set(ClientToServiceEvent.callMuteAudioUpdate, this.handleCallMuteAudioUpdate);
    this.handlers.set(ClientToServiceEvent.callCameraStateUpdate, this.handleCallCameraStateUpdate);
    this.handlers.set(ClientToServiceEvent.callNetworkStateUpdate, this.handleCallNetworkStateUpdate);
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

  private buildCallInfo(call: {
    id: string;
    clientCallId: string;
    conversationId: string;
    initiatorId: string;
    targetUserId: string;
    callType: string;
    state: string;
    startAt: Date;
    acceptedAt?: Date | null;
    connectedAt?: Date | null;
    endedAt?: Date | null;
    duration?: number | null;
    endReason?: string | null;
  }) {
    return {
      callId: call.id,
      clientCallId: call.clientCallId,
      conversationId: call.conversationId,
      initiatorId: call.initiatorId,
      targetUserId: call.targetUserId,
      callType: call.callType,
      state: call.state,
      startedAt: call.startAt.getTime(),
      acceptedAt: call.acceptedAt?.getTime(),
      connectedAt: call.connectedAt?.getTime(),
      endedAt: call.endedAt?.getTime(),
      durationSec: call.duration ?? undefined,
      endReason: call.endReason ?? undefined,
    };
  }

  private forwardCallPayload(
    targetUserId: string,
    event: ClientDecodeProtoMapKey,
    payload: Uint8Array,
    senderId: string,
  ) {
    this.sendMessageToUser(targetUserId, event, payload, senderId);
  }

  private handleCallInvite = async (
    client: ChatSocket,
    payload?: CallInviteRequest | null,
    requestId?: string,
  ) => {
    const userId = client.data.user?.id;
    if (!userId || !payload) return;

    try {
      const call = await this.callService.invite(userId, {
        clientCallId: payload.clientCallId,
        conversationId: payload.conversationId,
        targetUserId: payload.targetUserId,
        callType: payload.callType,
        senderDeviceId: payload.senderDeviceId,
      });

      const callInfo = this.buildCallInfo(call);
      this.sendMessageToClient(
        client,
        ServiceToClientEvent.callInviteResponse,
        CallInviteResponse.encode(CallInviteResponse.create({ call: callInfo })).finish(),
        requestId,
      );
      this.forwardCallPayload(
        payload.targetUserId,
        ServiceToClientEvent.callIncomingNotify,
        CallIncomingNotify.encode(
          CallIncomingNotify.create({
            call: callInfo,
            senderDeviceId: payload.senderDeviceId,
          }),
        ).finish(),
        userId,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        this.sendMessageToClient(
          client,
          ServiceToClientEvent.callBusyNotify,
          CallBusyNotify.encode(
            CallBusyNotify.create({
              call: {
                clientCallId: payload.clientCallId,
                conversationId: payload.conversationId,
                initiatorId: userId,
                targetUserId: payload.targetUserId,
                callType: payload.callType,
                state: CallSessionState.busy,
              },
            }),
          ).finish(),
          requestId,
        );
        return;
      }
      throw error;
    }
  };

  private handleCallAccept = async (client: ChatSocket, payload?: CallAcceptRequest | null) => {
    const userId = client.data.user?.id;
    if (!userId || !payload?.meta) return;
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!meta) return;

    const call = await this.callService.accept(userId, {
      callId: meta.callId,
      clientCallId: meta.clientCallId,
      conversationId: meta.conversationId,
      senderId: meta.senderId,
      targetUserId: meta.targetUserId,
      senderDeviceId: meta.senderDeviceId,
      targetDeviceId: meta.targetDeviceId,
      seq: meta.seq,
      timestamp: meta.timestamp,
    });

    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callStateSyncNotify,
      CallStateSyncNotify.encode(
        CallStateSyncNotify.create({
          call: this.buildCallInfo(call),
        }),
      ).finish(),
      userId,
    );
  };

  private handleCallReject = async (client: ChatSocket, payload?: CallRejectRequest | null) => {
    await this.handleCallEnd(client, payload?.meta, CallSessionState.rejected, payload?.reason || 'rejected');
  };

  private handleCallCancel = async (client: ChatSocket, payload?: CallCancelRequest | null) => {
    await this.handleCallEnd(client, payload?.meta, CallSessionState.cancelled, 'cancelled');
  };

  private handleCallHangup = async (client: ChatSocket, payload?: CallHangupRequest | null) => {
    await this.handleCallEnd(client, payload?.meta, CallSessionState.ended, payload?.reason || 'ended');
  };

  private async handleCallEnd(
    client: ChatSocket,
    meta: ICallSignalMeta | undefined | null,
    state: CallSessionState,
    reason: string,
  ) {
    const userId = client.data.user?.id;
    const signalMeta = this.parseCallSignalMeta(meta);
    if (!userId || !signalMeta) return;

    const call = await this.callService.end(
      userId,
      {
        callId: signalMeta.callId,
        clientCallId: signalMeta.clientCallId,
        conversationId: signalMeta.conversationId,
        senderId: signalMeta.senderId,
        targetUserId: signalMeta.targetUserId,
        senderDeviceId: signalMeta.senderDeviceId,
        targetDeviceId: signalMeta.targetDeviceId,
        seq: signalMeta.seq,
        timestamp: signalMeta.timestamp,
      },
      state,
      reason,
    );

    const response = CallEndedNotify.encode(
      CallEndedNotify.create({
        call: this.buildCallInfo(call),
        reason,
      }),
    ).finish();
    this.sendMessageToClient(client, ServiceToClientEvent.callEndedNotify, response);
    this.forwardCallPayload(signalMeta.targetUserId, ServiceToClientEvent.callEndedNotify, response, userId);
  }

  private handleCallSdpOffer = async (client: ChatSocket, payload?: CallSdpOffer | null) => {
    await this.forwardCallSdpOffer(client, payload);
  };

  private handleCallSdpAnswer = async (client: ChatSocket, payload?: CallSdpAnswer | null) => {
    await this.forwardCallSdpAnswer(client, payload);
  };

  private handleCallIceCandidate = async (
    client: ChatSocket,
    payload?: CallIceCandidate | null,
  ) => {
    await this.forwardCallIceCandidate(client, payload);
  };

  private handleCallIceRestart = async (
    client: ChatSocket,
    payload?: CallIceRestartRequest | null,
  ) => {
    await this.forwardCallIceRestart(client, payload);
  };

  private handleCallDeviceStateUpdate = async (
    client: ChatSocket,
    payload?: CallDeviceStateUpdate | null,
  ) => {
    await this.forwardCallDeviceStateUpdate(client, payload);
  };

  private handleCallMuteAudioUpdate = async (
    client: ChatSocket,
    payload?: CallMuteAudioUpdate | null,
  ) => {
    await this.forwardCallMuteAudioUpdate(client, payload);
  };

  private handleCallCameraStateUpdate = async (
    client: ChatSocket,
    payload?: CallCameraStateUpdate | null,
  ) => {
    await this.forwardCallCameraStateUpdate(client, payload);
  };

  private handleCallNetworkStateUpdate = async (
    client: ChatSocket,
    payload?: CallNetworkStateUpdate | null,
  ) => {
    await this.forwardCallNetworkStateUpdate(client, payload);
  };

  private getCallSenderId(client: ChatSocket, payloadMeta?: ICallSignalMeta | null) {
    const userId = client.data.user?.id;
    if (!userId || !payloadMeta) return null;

    return userId;
  }

  private parseCallSignalMeta(meta?: ICallSignalMeta | null) {
    if (
      !meta?.callId ||
      !meta.clientCallId ||
      !meta.conversationId ||
      !meta.senderId ||
      !meta.targetUserId ||
      !meta.senderDeviceId
    ) {
      return null;
    }

    return {
      callId: meta.callId,
      clientCallId: meta.clientCallId,
      conversationId: meta.conversationId,
      senderId: meta.senderId,
      targetUserId: meta.targetUserId,
      senderDeviceId: meta.senderDeviceId,
      targetDeviceId: meta.targetDeviceId ?? null,
      seq: Number(meta.seq),
      timestamp: Number(meta.timestamp),
    };
  }

  private async forwardCallSdpOffer(client: ChatSocket, payload?: CallSdpOffer | null) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'sdp_offer');
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callSdpOffer,
      CallSdpOffer.encode(payload).finish(),
      userId,
    );
  }

  private async forwardCallSdpAnswer(client: ChatSocket, payload?: CallSdpAnswer | null) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'sdp_answer');
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callSdpAnswer,
      CallSdpAnswer.encode(payload).finish(),
      userId,
    );
  }

  private async forwardCallIceCandidate(client: ChatSocket, payload?: CallIceCandidate | null) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'ice_candidate');
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callIceCandidate,
      CallIceCandidate.encode(payload).finish(),
      userId,
    );
  }

  private async forwardCallIceRestart(client: ChatSocket, payload?: CallIceRestartRequest | null) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'ice_restart');
    const notify = CallIceRestartNotify.create({ meta: payload.meta });
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callIceRestartNotify,
      CallIceRestartNotify.encode(notify).finish(),
      userId,
    );
  }

  private async forwardCallDeviceStateUpdate(
    client: ChatSocket,
    payload?: CallDeviceStateUpdate | null,
  ) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'device_state', {
      input_device_id: payload.inputDeviceId,
      output_device_id: payload.outputDeviceId,
    });
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callDeviceStateUpdate,
      CallDeviceStateUpdate.encode(payload).finish(),
      userId,
    );
  }

  private async forwardCallMuteAudioUpdate(
    client: ChatSocket,
    payload?: CallMuteAudioUpdate | null,
  ) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'mute_audio', {
      muted: payload.muted,
    });
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callMuteAudioUpdate,
      CallMuteAudioUpdate.encode(payload).finish(),
      userId,
    );
  }

  private async forwardCallCameraStateUpdate(
    client: ChatSocket,
    payload?: CallCameraStateUpdate | null,
  ) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'camera_state', {
      enabled: payload.enabled,
    });
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callCameraStateUpdate,
      CallCameraStateUpdate.encode(payload).finish(),
      userId,
    );
  }

  private async forwardCallNetworkStateUpdate(
    client: ChatSocket,
    payload?: CallNetworkStateUpdate | null,
  ) {
    if (!payload) return;
    const userId = this.getCallSenderId(client, payload.meta);
    const meta = this.parseCallSignalMeta(payload.meta);
    if (!userId || !meta) return;

    await this.callService.syncRtcEvent(meta.callId, userId, 'network_state', {
      state: payload.state,
    });
    this.forwardCallPayload(
      meta.targetUserId,
      ServiceToClientEvent.callNetworkStateUpdate,
      CallNetworkStateUpdate.encode(payload).finish(),
      userId,
    );
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
      lastReadMessageId?: number | null;
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
      lastReadMessageId: conversation.lastReadMessageId ?? 0,
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
      lastReadMessageId?: number | null;
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

    const encodedList = list.map((c) => {
      let targetInfo: ITargetInfo | undefined;

      if (c.type === 2 && c.group) {
        targetInfo = {
          id: c.group.id,
          name: c.group.name,
          avatarUrl: c.group.avatarUrl,
        };
      } else if (c.user) {
        targetInfo = {
          id: c.user.id,
          name: c.user.nickname,
          avatarUrl: c.user.avatarUrl,
        };
      }

      return ConversationInfo.create({
        id: c.id,
        type: c.type,
        lastMsgContent: c.lastMsgContent ?? undefined,
        lastMsgTime: c.lastMsgTime ? new Date(c.lastMsgTime).getTime() : undefined,
        updateTime: c.updateTime.getTime(),
        createTime: c.createTime.getTime(),
        unreadCount: c.unreadCount ?? 0,
        lastReadMessageId: c.lastReadMessageId ?? 0,
        targetInfo,
      });
    });

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
      payload.messageId ?? undefined,
    );

    const response = ReadMessageResponse.encode(
      ReadMessageResponse.create({
        conversationId: result.conversationId,
        messageId: result.messageId,
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
    senderId: string,
    message: MessageInfo,
  ): Promise<Map<string, IConversationInfo>> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      include: {
        conversation: true,
        user: true,
      },
    });

    const conversation = participants[0]?.conversation;
    const group =
      conversation?.type === 2 && conversation.targetId
        ? await this.prisma.group.findUnique({ where: { id: conversation.targetId } })
        : null;

    return new Map(
      participants.map((participant) => {
        const peer = participants.find((item) => item.userId !== participant.userId)?.user;
        const conversation = participant.conversation;
        const targetInfo = group
          ? {
              id: group.id,
              name: group.name,
              avatarUrl: group.avatarUrl ?? '',
            }
          : peer
            ? {
                id: peer.id,
                name: participant.remark || peer.nickname || '',
                avatarUrl: peer.avatarUrl ?? '',
              }
            : undefined;
        return [
          participant.userId,
          ConversationInfo.create({
            id: conversation.id,
            type: conversation.type,
            targetInfo,
            lastMsgContent: this.getLastMsgContent(message.content, message.type),
            lastMsgTime: message.createTime ? Number(message.createTime) : undefined,
            updateTime: message.updateTime ? Number(message.updateTime) : undefined,
            createTime: conversation.createTime.getTime(),
            unreadCount: participant.userId === senderId ? 0 : (participant.unreadCount ?? 0) + 1,
            lastReadMessageId:
              participant.userId === senderId ? message.msgId : participant.lastReadMessageId,
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
      NewUpdateMessage.create({
        messages,
        conversations,
        removedConversationIds,
      }),
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
    let isNewConversation = false;
    if (!senderId || (!content && !fileId) || !clientMsgId || (!conversationId && !targetId)) {
      this.sendMessageToClient(
        client,
        ServiceToClientEvent.ackSendMessage,
        AckSendMessage.encode(AckSendMessage.create({ clientMsgId, status: '' })).finish(),
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
      const conversation = await this.chatService.getOrCreatePrivateConversation(
        senderId,
        targetId!,
      );
      isNewConversation = conversation.isNew;
      conversationId = conversation.id;
    }

    try {
      await this.chatService.assertCanSendMessage(senderId, conversationId);
    } catch {
      this.sendMessageToClient(
        client,
        ServiceToClientEvent.ackSendMessage,
        AckSendMessage.encode(AckSendMessage.create({ clientMsgId, status: 'fail' })).finish(),
        requestId,
      );
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
    const messagePayload = buildMessageInfoPayload(message);

    if (isNewConversation && targetId) {
      await this.joinUserToRoom(this.server, [senderId, targetId], conversationId);
    }

    const updateMessage = MessageInfo.create(messagePayload);

    const conversationByUserId = await this.buildConversationUpdatesByUserId(
      conversationId,
      senderId,
      updateMessage,
    );

    for (const [userId, conversation] of conversationByUserId) {
      const response = this.buildNewUpdateMessage([updateMessage], [conversation]);
      this.sendMessageToUser(userId, ServiceToClientEvent.newUpdateMessage, response, senderId);
    }
  };
}
