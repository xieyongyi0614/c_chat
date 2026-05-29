import { socketService } from './socket.service';
import { MessageDB, ConversationDB } from '../db';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import {
  SendMessageRequest,
  GetMessageHistoryRequest,
  GetMessageHistoryResponse,
  ReadMessageRequest,
  ReadMessageResponse,
  NewUpdateMessage,
  AckSendMessage,
} from '@c_chat/shared-protobuf';
import type { LocalMessageListItem, MessageStatus as MessageStatusType } from '@c_chat/shared-types';
import { MessageStatus } from '@c_chat/shared-types';

export interface SendMessageParams {
  conversationId?: string;
  targetId?: string;
  content: string;
  type?: number;
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
    const clientMsgId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingMessage: LocalMessageListItem = {
      id: clientMsgId,
      conversationId: params.conversationId || '',
      seq: BigInt(0),
      clientMsgId,
      senderId: '',
      content: params.content,
      type: params.type || 1,
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

    try {
      const request = SendMessageRequest.create({
        conversationId: params.conversationId,
        targetId: params.targetId,
        content: params.content,
        type: params.type,
        clientMsgId,
        fileId: params.fileId,
        mediaGroupId: params.mediaGroupId,
      });

      const payload = SendMessageRequest.encode(request).finish();
      socketService.request(ClientToServiceEvent.sendMessage, payload).catch((error) => {
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
      await socketService.request(ClientToServiceEvent.sendMessage, payload);
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
    beforeMsgId?: string
  ): Promise<LocalMessageListItem[]> {
    try {
      const request = GetMessageHistoryRequest.create({
        conversationId,
        pageSize,
        afterMsgId,
        beforeMsgId,
      });

      const payload = GetMessageHistoryRequest.encode(request).finish();
      const response: GetMessageHistoryResponse = await socketService.request(
        ClientToServiceEvent.getMessageHistory,
        payload
      );

      const messages: LocalMessageListItem[] = response.list.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        seq: BigInt(msg.seq),
        clientMsgId: msg.clientMsgId || '',
        senderId: msg.senderId,
        senderNickname: msg.senderInfo?.nickname || '',
        senderAvatar: msg.senderInfo?.avatarUrl || '',
        senderEmail: msg.senderInfo?.email || '',
        content: msg.content,
        type: msg.type,
        status: MessageStatus.success,
        updateTime: Number(msg.updateTime),
        createTime: Number(msg.createTime),
        localTime: Date.now(),
      }));

      await MessageDB.upsertMany(messages);
      return messages;
    } catch (error) {
      console.error('[MessageService] getMessageHistory error:', error);
      return this.getLocalMessageHistory(conversationId, pageSize);
    }
  }

  async getLocalMessageHistory(
    conversationId: string,
    limit = 50
  ): Promise<LocalMessageListItem[]> {
    return MessageDB.getByConversation(conversationId, limit);
  }

  async readMessage(conversationId: string, messageId?: string): Promise<void> {
    try {
      const request = ReadMessageRequest.create({
        conversationId,
      });

      const payload = ReadMessageRequest.encode(request).finish();
      await socketService.request(ClientToServiceEvent.readMessage, payload);
    } catch (error) {
      console.error('[MessageService] readMessage error:', error);
    }
  }

  private async updateMessageStatus(clientMsgId: string, status: MessageStatus): Promise<void> {
    const message = await MessageDB.getByClientMsgId(clientMsgId);
    if (message) {
      message.status = status;
      await MessageDB.upsert(message);
    }
  }

  setupRealtimeListeners(): void {
    socketService.on('ackSendMessage', async (data: AckSendMessage) => {
      const message = await MessageDB.getByClientMsgId(data.clientMsgId);
      if (message) {
        message.id = data.messageId;
        message.seq = BigInt(data.seq);
        message.status = MessageStatus.success;
        message.createTime = Number(data.timestamp);
        await MessageDB.upsert(message);
      }
    });

    socketService.on('newUpdateMessage', async (data: NewUpdateMessage) => {
      if (!data.messages || data.messages.length === 0) return;

      for (const msg of data.messages) {
        const message: LocalMessageListItem = {
          id: msg.id,
          conversationId: msg.conversationId,
          seq: BigInt(msg.seq),
          clientMsgId: msg.clientMsgId || '',
          senderId: msg.senderId,
          senderNickname: msg.senderInfo?.nickname || '',
          senderAvatar: msg.senderInfo?.avatarUrl || '',
          senderEmail: msg.senderInfo?.email || '',
          content: msg.content,
          type: msg.type,
          status: MessageStatus.success,
          updateTime: Number(msg.updateTime),
          createTime: Number(msg.createTime),
          localTime: Date.now(),
        };

        await MessageDB.upsert(message);

        const conversation = await ConversationDB.getById(msg.conversationId);
        if (conversation) {
          conversation.lastMsgContent = msg.content;
          conversation.lastMsgTime = Number(msg.createTime);
          conversation.updateTime = Number(msg.updateTime);
          if (msg.senderId !== conversation.targetId) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
          await ConversationDB.upsert(conversation);
        }
      }
    });
  }
}

export const messageService = new MessageService();
