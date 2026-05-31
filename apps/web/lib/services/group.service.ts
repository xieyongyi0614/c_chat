import { getRealtimeClient } from '../api/client';
import { ConversationDB } from '../db';
import { useConversationStore } from '../stores/conversation.store';
import { conversationService } from './conversation.service';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import {
  CreateGroupRequest,
  GetGroupDetailRequest,
  UpdateGroupRequest,
  InviteGroupMembersRequest,
  LeaveGroupRequest,
  DismissGroupRequest,
} from '@c_chat/shared-protobuf';
import type {
  CreateGroupParams,
  UpdateGroupParams,
  InviteGroupMembersParams,
  GetGroupDetailParams,
  GetGroupDetailResult,
  GroupOperationResult,
  GroupActionParams,
  LocalConversationListItem,
} from '@c_chat/shared-types';

export class GroupService {
  async createGroup(params: CreateGroupParams): Promise<LocalConversationListItem> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const request = CreateGroupRequest.create({
      name: params.name,
      memberIds: params.memberIds,
      avatarUrl: params.avatarUrl,
    });
    const payload = CreateGroupRequest.encode(request).finish();
    const response = await realtimeClient.genericRequest(ClientToServiceEvent.createGroup, payload);

    if (!response.conversation) {
      throw new Error('创建群聊响应缺少会话数据');
    }

    const conversation = conversationService.toLocalConversation(response.conversation);
    await ConversationDB.upsert(conversation);
    useConversationStore.getState().upsertConversation(conversation);
    return conversation;
  }

  async getGroupDetail(params: GetGroupDetailParams): Promise<GetGroupDetailResult> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const request = GetGroupDetailRequest.create({ groupId: params.groupId });
    const payload = GetGroupDetailRequest.encode(request).finish();
    return realtimeClient.genericRequest(ClientToServiceEvent.getGroupDetail, payload);
  }

  async updateGroup(params: UpdateGroupParams): Promise<GroupOperationResult> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const request = UpdateGroupRequest.create({
      groupId: params.groupId,
      name: params.name,
      avatarUrl: params.avatarUrl,
      notice: params.notice,
    });
    const payload = UpdateGroupRequest.encode(request).finish();
    const response = await realtimeClient.genericRequest(ClientToServiceEvent.updateGroup, payload);

    if (response.conversation) {
      const conversation = conversationService.toLocalConversation(response.conversation);
      await ConversationDB.upsert(conversation);
      useConversationStore.getState().upsertConversation(conversation);
    }
    return response;
  }

  async inviteGroupMembers(params: InviteGroupMembersParams): Promise<GroupOperationResult> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const request = InviteGroupMembersRequest.create({
      groupId: params.groupId,
      memberIds: params.memberIds,
    });
    const payload = InviteGroupMembersRequest.encode(request).finish();
    return realtimeClient.genericRequest(ClientToServiceEvent.inviteGroupMembers, payload);
  }

  async leaveGroup(params: GroupActionParams): Promise<GroupOperationResult> {
    return this.removeGroupConversation(ClientToServiceEvent.leaveGroup, params);
  }

  async dismissGroup(params: GroupActionParams): Promise<GroupOperationResult> {
    return this.removeGroupConversation(ClientToServiceEvent.dismissGroup, params);
  }

  private async removeGroupConversation(
    event: typeof ClientToServiceEvent.leaveGroup | typeof ClientToServiceEvent.dismissGroup,
    params: GroupActionParams,
  ): Promise<GroupOperationResult> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const payload =
      event === ClientToServiceEvent.leaveGroup
        ? LeaveGroupRequest.encode(LeaveGroupRequest.create({ groupId: params.groupId })).finish()
        : DismissGroupRequest.encode(
            DismissGroupRequest.create({ groupId: params.groupId }),
          ).finish();

    const response = await realtimeClient.genericRequest(event, payload);

    if (response.success) {
      const conversationId = response.conversation?.id ?? params.groupId;
      await ConversationDB.delete(conversationId);
      useConversationStore.getState().removeConversations([conversationId]);
    }
    return response;
  }
}

export const groupService = new GroupService();
