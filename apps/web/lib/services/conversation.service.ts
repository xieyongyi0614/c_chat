import { socketService } from './socket.service';
import { ConversationDB, MessageDB } from '../db';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import {
  GetConversationListRequest,
  GetConversationListResponse,
  ConversationInfo,
} from '@c_chat/shared-protobuf';
import type { LocalConversationListItem } from '@c_chat/shared-types';

export class ConversationService {
  async getConversationList(page = 1, pageSize = 50): Promise<LocalConversationListItem[]> {
    try {
      const request = GetConversationListRequest.create({ pageSize });
      const payload = GetConversationListRequest.encode(request).finish();

      const response: GetConversationListResponse = await socketService.request(
        ClientToServiceEvent.getConversationList,
        payload
      );

      const conversations: LocalConversationListItem[] = response.list.map((item) => ({
        id: item.id,
        type: item.type,
        targetId: item.id,
        targetName: item.targetInfo?.nickname || item.targetInfo?.email || '',
        targetAvatar: item.targetInfo?.avatarUrl || '',
        lastMsgContent: item.lastMessage?.content || '',
        lastMsgTime: Number(item.lastMessage?.createTime || 0),
        updateTime: Number(item.updateTime),
        createTime: Number(item.createTime),
        unreadCount: item.unreadCount || 0,
        lastReadSeq: BigInt(item.lastReadSeq || 0),
      }));

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

  async createConversation(targetId: string): Promise<LocalConversationListItem | null> {
    try {
      const request = GetConversationListRequest.create({});
      const payload = GetConversationListRequest.encode(request).finish();

      const response: GetConversationListResponse = await socketService.request(
        ClientToServiceEvent.getConversationList,
        payload
      );

      if (response.list.length === 0) return null;
      const item = response.list[0];

      const conversation: LocalConversationListItem = {
        id: item.id,
        type: item.type,
        targetId: item.id,
        targetName: item.targetInfo?.nickname || item.targetInfo?.email || '',
        targetAvatar: item.targetInfo?.avatarUrl || '',
        lastMsgContent: '',
        lastMsgTime: 0,
        updateTime: Number(item.updateTime),
        createTime: Number(item.createTime),
        unreadCount: 0,
        lastReadSeq: BigInt(0),
      };

      await ConversationDB.upsert(conversation);
      return conversation;
    } catch (error) {
      console.error('[ConversationService] createConversation error:', error);
      return null;
    }
  }

  setupRealtimeListeners(): void {
    socketService.on('newConversation', async (data: ConversationInfo) => {
      const conversation: LocalConversationListItem = {
        id: data.id,
        type: data.type,
        targetId: data.id,
        targetName: data.targetInfo?.nickname || data.targetInfo?.email || '',
        targetAvatar: data.targetInfo?.avatarUrl || '',
        lastMsgContent: data.lastMessage?.content || '',
        lastMsgTime: Number(data.lastMessage?.createTime || 0),
        updateTime: Number(data.updateTime),
        createTime: Number(data.createTime),
        unreadCount: data.unreadCount || 0,
        lastReadSeq: BigInt(data.lastReadSeq || 0),
      };

      await ConversationDB.upsert(conversation);
    });
  }
}

export const conversationService = new ConversationService();
