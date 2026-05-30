import { socketService } from './socket.service';
import { MessageDB, ConversationDB } from '../db';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import {
  SendMessageRequest,
  GetMessageHistoryRequest,
  GetMessageHistoryResponse,
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
    const clientMsgId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingMessage: LocalMessageListItem = {
      id: clientMsgId,
      conversationId: params.conversationId || '',
      seq: BigInt(0),
      clientMsgId,
      senderId: '',
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
    beforeMsgId?: string,
  ): Promise<LocalMessageListItem[]> {
    try {
      const request = GetMessageHistoryRequest.create({
        conversationId,
        limit: pageSize,
        afterMsgId: afterMsgId ? Number(afterMsgId) : undefined,
        beforeMsgId: beforeMsgId ? Number(beforeMsgId) : undefined,
      });

      const payload = GetMessageHistoryRequest.encode(request).finish();
      const response: GetMessageHistoryResponse = await socketService.request(
        ClientToServiceEvent.getMessageHistory,
        payload,
      );

      const messages = response.list.map((msg) => this.toLocalMessage(msg));

      await MessageDB.upsertMany(messages);
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
    try {
      const request = ReadMessageRequest.create({
        conversationId,
        msgSeq,
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
        message.status = data.status === 'success' ? MessageStatus.success : MessageStatus.fail;
        await MessageDB.upsert(message);
      }
    });

    socketService.on('newUpdateMessage', async (data: NewUpdateMessage) => {
      if (!data.messages || data.messages.length === 0) return;

      for (const msg of data.messages) {
        const message = this.toLocalMessage(msg);

        await MessageDB.upsert(message);

        const conversation = await ConversationDB.getById(message.conversationId);
        if (conversation) {
          conversation.lastMsgContent = message.content;
          conversation.lastMsgTime = message.createTime;
          conversation.updateTime = message.updateTime;
          if (message.senderId !== conversation.targetId) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
          await ConversationDB.upsert(conversation);
        }
      }
    });
  }

  private toLocalMessage(item: IMessageInfo): LocalMessageListItem {
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
