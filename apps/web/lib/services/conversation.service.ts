import { getRealtimeClient } from '../api/client';
import { ConversationDB } from '../db';
import { useConversationStore } from '../stores/conversation.store';
import { useUserStore } from '../stores/user.store';
import { ClientToServiceEvent, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import {
  GetConversationListRequest,
  ConversationInfo,
  type IConversationInfo,
} from '@c_chat/shared-protobuf';
import { ConversationType, type LocalConversationListItem } from '@c_chat/shared-types';

export class ConversationService {
  async getConversationList(page = 1, pageSize = 50): Promise<LocalConversationListItem[]> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      return this.getLocalConversationList();
    }

    const requestUserId = useUserStore.getState().userInfo?.id;

    try {
      const request = GetConversationListRequest.create({
        pagination: { page, pageSize },
      });
      const payload = GetConversationListRequest.encode(request).finish();

      const response = await realtimeClient.genericRequest(
        ClientToServiceEvent.getConversationList,
        payload,
      );

      // 过期回包保护：登录用户已变更则丢弃
      if (useUserStore.getState().userInfo?.id !== requestUserId) {
        return this.getLocalConversationList();
      }

      const conversations = response.list?.map((item) => this.toLocalConversation(item)) ?? [];

      await ConversationDB.upsertMany(conversations);
      useConversationStore.getState().upsertMany(conversations);
      return conversations;
    } catch (error) {
      console.error('[ConversationService] getConversationList error:', error);
      return this.getLocalConversationList();
    }
  }

  async getLocalConversationList(): Promise<LocalConversationListItem[]> {
    const conversations = await ConversationDB.getAll();
    return [...conversations].sort((a, b) => b.updateTime - a.updateTime);
  }

  setupRealtimeListeners(): void {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      console.warn('[ConversationService] RealtimeClient not initialized');
      return;
    }

    realtimeClient.subscribeToEvent(
      ServiceToClientEvent.newConversation,
      async (data: ConversationInfo) => {
        if (!getRealtimeClient()) return;
        const conversation = this.toLocalConversation(data);
        await ConversationDB.upsert(conversation);
        useConversationStore.getState().upsertConversation(conversation);
      },
    );
  }

  toLocalConversation(item: IConversationInfo): LocalConversationListItem {
    const conversation = ConversationInfo.create(item);
    return {
      id: conversation.id,
      type:
        conversation.type === ConversationType.Group
          ? ConversationType.Group
          : ConversationType.Single,
      targetId: conversation.targetInfo?.id ?? conversation.id,
      targetName: conversation.targetInfo?.name ?? '',
      targetAvatar: conversation.targetInfo?.avatarUrl ?? '',
      lastMsgContent: conversation.lastMsgContent ?? '',
      lastMsgTime: Number(conversation.lastMsgTime ?? 0),
      updateTime: Number(conversation.updateTime),
      createTime: Number(conversation.createTime),
      unreadCount: conversation.unreadCount ?? 0,
      lastReadSeq: BigInt(conversation.lastReadSeq ?? 0),
    };
  }
}

export const conversationService = new ConversationService();
