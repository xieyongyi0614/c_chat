import { getRealtimeClient } from '../api/client';
import { ConversationDB } from '../db';
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

    try {
      const request = GetConversationListRequest.create({
        pagination: { page, pageSize },
      });
      const payload = GetConversationListRequest.encode(request).finish();

      const response = await realtimeClient.genericRequest(
        ClientToServiceEvent.getConversationList,
        payload,
      );

      const conversations = response.list.map((item) => this.toLocalConversation(item));

      await ConversationDB.upsertMany(conversations);
      return conversations;
    } catch (error) {
      console.error('[ConversationService] getConversationList error:', error);
      return this.getLocalConversationList();
    }
  }

  async getLocalConversationList(): Promise<LocalConversationListItem[]> {
    return ConversationDB.getAll();
  }

  async createConversation(): Promise<LocalConversationListItem | null> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    try {
      const request = GetConversationListRequest.create({});
      const payload = GetConversationListRequest.encode(request).finish();

      const response = await realtimeClient.genericRequest(
        ClientToServiceEvent.getConversationList,
        payload,
      );

      if (response.list.length === 0) return null;
      const item = response.list[0];

      const conversation = this.toLocalConversation(item);

      await ConversationDB.upsert(conversation);
      return conversation;
    } catch (error) {
      console.error('[ConversationService] createConversation error:', error);
      return null;
    }
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
        const conversation = this.toLocalConversation(data);
        await ConversationDB.upsert(conversation);
      },
    );
  }

  private toLocalConversation(item: IConversationInfo): LocalConversationListItem {
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
