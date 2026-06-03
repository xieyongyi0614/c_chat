import { getRealtimeClient } from '../api/client';
import { MessageDB, ConversationDB } from '../db';
import { useConversationStore } from '../stores/conversation.store';
import { useMessageStore } from '../stores/message.store';
import { useUserStore } from '../stores/user.store';
import { conversationService } from './conversation.service';
import { ClientToServiceEvent, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import {
  SendMessageRequest,
  GetMessageHistoryRequest,
  ReadMessageRequest,
  NewUpdateMessage,
  AckSendMessage,
  MessageInfo,
  type IMessageInfo,
} from '@c_chat/shared-protobuf';
import { MessageStatus } from '@c_chat/shared-types';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { MESSAGE_TYPE, type MessageType } from '@c_chat/shared-config';

export interface SendMessageParams {
  conversationId?: string;
  targetId?: string;
  content: string;
  clientMsgId?: string;
  type?: MessageType;
  fileId?: string;
  fileUrl?: string;
  mediaGroupId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  waveform?: string;
  duration?: number;
}

export class MessageService {
  async sendMessage(params: SendMessageParams): Promise<LocalMessageListItem[]> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const clientMsgId =
      params.clientMsgId ?? `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userInfo = useUserStore.getState().userInfo;

    const pendingMessage: LocalMessageListItem = {
      id: clientMsgId,
      conversationId: params.conversationId || '',
      seq: BigInt(0),
      clientMsgId,
      senderId: userInfo?.id ?? '',
      senderNickname: userInfo?.nickname ?? userInfo?.email ?? '',
      senderAvatar: userInfo?.avatarUrl ?? '',
      senderEmail: userInfo?.email ?? '',
      content: params.content,
      type: params.type ?? MESSAGE_TYPE.Text,
      status: MessageStatus.sending,
      updateTime: Date.now(),
      createTime: Date.now(),
      localTime: Date.now(),
      fileId: params.fileId,
      fileUrl: params.fileUrl,
      mediaGroupId: params.mediaGroupId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      waveform: params.waveform,
      duration: params.duration,
    };

    await MessageDB.upsert(pendingMessage);
    useMessageStore.getState().upsertMany(pendingMessage.conversationId, [pendingMessage]);

    try {
      const request = SendMessageRequest.create({
        conversationId: params.conversationId,
        targetId: params.targetId,
        content: params.content,
        type: params.type,
        clientMsgId,
        fileId: params.fileId,
        mediaGroupId: params.mediaGroupId,
        durationSec: params.duration,
        waveform: params.waveform,
      });

      const payload = SendMessageRequest.encode(request).finish();
      realtimeClient.genericRequest(ClientToServiceEvent.sendMessage, payload).catch((error) => {
        console.error('[MessageService] sendMessage error:', error);
        this.updateMessageStatus(clientMsgId, MessageStatus.fail);
      });

      return [pendingMessage];
    } catch (error) {
      console.error('[MessageService] sendMessage error:', error);
      await this.updateMessageStatus(clientMsgId, MessageStatus.fail);
      throw error;
    }
  }

  async resendMessage(clientMsgId: string): Promise<void> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const message = await MessageDB.getByClientMsgId(clientMsgId);
    if (!message) {
      throw new Error('Message not found');
    }

    await this.updateMessageStatus(clientMsgId, MessageStatus.sending);

    try {
      const request = SendMessageRequest.create({
        conversationId: message.conversationId,
        content: message.content,
        type: message.type,
        clientMsgId: message.clientMsgId,
        fileId: message.fileId,
        mediaGroupId: message.mediaGroupId,
      });

      const payload = SendMessageRequest.encode(request).finish();
      await realtimeClient.genericRequest(ClientToServiceEvent.sendMessage, payload);
    } catch (error) {
      console.error('[MessageService] resendMessage error:', error);
      await this.updateMessageStatus(clientMsgId, MessageStatus.fail);
      throw error;
    }
  }

  async getMessageHistory(
    conversationId: string,
    pageSize = 50,
    afterMsgId?: string,
    beforeMsgId?: string,
  ): Promise<LocalMessageListItem[]> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      return this.getLocalMessageHistory(conversationId, pageSize);
    }

    try {
      const request = GetMessageHistoryRequest.create({
        conversationId,
        limit: pageSize,
        afterMsgId: afterMsgId ? Number(afterMsgId) : undefined,
        beforeMsgId: beforeMsgId ? Number(beforeMsgId) : undefined,
      });

      const payload = GetMessageHistoryRequest.encode(request).finish();
      const response = await realtimeClient.genericRequest(
        ClientToServiceEvent.getMessageHistory,
        payload,
      );

      const messages = response.list.map((msg) => this.toLocalMessage(msg));

      await MessageDB.upsertMany(messages);
      useMessageStore.getState().upsertMany(conversationId, messages);
      return messages;
    } catch (error) {
      console.error('[MessageService] getMessageHistory error:', error);
      return this.getLocalMessageHistory(conversationId, pageSize);
    }
  }

  async getLocalMessageHistory(
    conversationId: string,
    limit = 50,
  ): Promise<LocalMessageListItem[]> {
    return MessageDB.getByConversation(conversationId, limit);
  }

  async readMessage(conversationId: string, msgSeq?: string): Promise<void> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      return;
    }

    try {
      const request = ReadMessageRequest.create({
        conversationId,
        msgSeq,
      });

      const payload = ReadMessageRequest.encode(request).finish();
      const response = await realtimeClient.genericRequest(
        ClientToServiceEvent.readMessage,
        payload,
      );

      // 服务端权威未读数回写
      const conversation = await ConversationDB.getById(response.conversationId);
      if (conversation) {
        conversation.unreadCount = response.unreadCount;
        conversation.lastReadSeq = BigInt(response.msgSeq ?? conversation.lastReadSeq);
        await ConversationDB.upsert(conversation);
        useConversationStore.getState().upsertConversation(conversation);
      }
    } catch (error) {
      console.error('[MessageService] readMessage error:', error);
    }
  }

  private async updateMessageStatus(clientMsgId: string, status: MessageStatus): Promise<void> {
    const message = await MessageDB.getByClientMsgId(clientMsgId);
    if (message) {
      message.status = status;
      await MessageDB.upsert(message);
      useMessageStore.getState().upsertMany(message.conversationId, [message]);
    }
  }

  setupRealtimeListeners(): void {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      console.warn('[MessageService] RealtimeClient not initialized');
      return;
    }

    realtimeClient.subscribeToEvent(
      ServiceToClientEvent.ackSendMessage,
      async (data: AckSendMessage) => {
        const message = await MessageDB.getByClientMsgId(data.clientMsgId);
        if (message) {
          message.status = data.status === 'success' ? MessageStatus.success : MessageStatus.fail;
          await MessageDB.upsert(message);
          useMessageStore.getState().upsertMany(message.conversationId, [message]);
        }
      },
    );

    realtimeClient.subscribeToEvent(
      ServiceToClientEvent.newUpdateMessage,
      async (data: NewUpdateMessage) => {
        if (!getRealtimeClient()) return;

        if (data.messages && data.messages.length > 0) {
          const messages = data.messages.map((msg) => this.toLocalMessage(msg));
          await MessageDB.upsertMany(messages);
          const store = useMessageStore.getState();
          const current = store.currentConversationId;
          if (current) {
            store.upsertMany(
              current,
              messages.filter((message) => message.conversationId === current),
            );
          }
        }

        if (data.conversations && data.conversations.length > 0) {
          const conversations = data.conversations.map((c) =>
            conversationService.toLocalConversation(c),
          );
          await ConversationDB.upsertMany(conversations);
          useConversationStore.getState().upsertMany(conversations);
        }

        if (data.removedConversationIds && data.removedConversationIds.length > 0) {
          await Promise.all(data.removedConversationIds.map((id) => ConversationDB.delete(id)));
          useConversationStore.getState().removeConversations(data.removedConversationIds);
        }
      },
    );
  }

  toLocalMessage(item: IMessageInfo): LocalMessageListItem {
    const message = MessageInfo.create(item);
    return {
      id: message.id,
      conversationId: message.conversationId,
      seq: BigInt(message.seq),
      clientMsgId: message.clientMsgId || '',
      senderId: message.senderId,
      senderNickname: message.senderInfo?.nickname || '',
      senderAvatar: message.senderInfo?.avatarUrl || '',
      senderEmail: message.senderInfo?.email || '',
      content: message.content,
      type: this.toMessageType(message.type),
      status: MessageStatus.success,
      updateTime: Number(message.updateTime),
      createTime: Number(message.createTime),
      localTime: Date.now(),
      mediaGroupId: message.mediaGroupId ?? undefined,
      fileId: message.media?.fileId ?? '',
      fileUrl: message.media?.fileUrl ?? message.media?.file?.url ?? '',
      fileName: message.media?.file?.fileName ?? '',
      mimeType: message.media?.file?.mimeType ?? '',
      fileSize: Number(message.media?.file?.size ?? 0),
      waveform: message.media?.waveform ?? '',
      duration: message.media?.durationSec ?? 0,
    };
  }

  private toMessageType(type: number): MessageType {
    switch (type) {
      case MESSAGE_TYPE.Image:
      case MESSAGE_TYPE.Video:
      case MESSAGE_TYPE.File:
      case MESSAGE_TYPE.Audio:
        return type;
      default:
        return MESSAGE_TYPE.Text;
    }
  }
}

export const messageService = new MessageService();
