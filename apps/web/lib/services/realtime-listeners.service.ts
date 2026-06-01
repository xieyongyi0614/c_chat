import { SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import type { MessageType } from '@c_chat/shared-config';
import type {
  AckSendMessage,
  ConversationInfo,
  ErrorResult,
  NewUpdateMessage,
  SendFileUploadComplete,
} from '@c_chat/shared-protobuf';
import { ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import { MessageStatus } from '@c_chat/shared-types';
import { getRealtimeClient, destroyRealtimeClient } from '../api/client';
import { ConversationDB, MessageDB, UploadTaskDB } from '../db';
import { useConversationStore } from '../stores/conversation.store';
import { useMessageStore } from '../stores/message.store';
import { AuthSessionStorage } from './authSession.storage';
import { conversationService } from './conversation.service';
import { messageService } from './message.service';

const REGISTER_ID = 'web-realtime-listeners';

export class RealtimeListenersService {
  register(): void {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      console.warn('[RealtimeListenersService] RealtimeClient not initialized');
      return;
    }

    Object.values(ServiceToClientEvent)
      .filter((event) => event !== ServiceToClientEvent.pong)
      .forEach((event) => {
        realtimeClient.subscribeToEvent(event, this.handleEvent(event), REGISTER_ID);
      });
  }

  private handleEvent(event: (typeof ServiceToClientEvent)[keyof typeof ServiceToClientEvent]) {
    switch (event) {
      case ServiceToClientEvent.error:
        return (data: ErrorResult) => {
          this.handleError(data);
        };
      case ServiceToClientEvent.ackSendMessage:
        return (data: AckSendMessage) => this.handleAckSendMessage(data);
      case ServiceToClientEvent.newUpdateMessage:
        return (data: NewUpdateMessage) => this.handleNewUpdateMessage(data);
      case ServiceToClientEvent.newConversation:
        return (data: ConversationInfo) => this.handleNewConversation(data);
      case ServiceToClientEvent.sendFileUploadComplete:
        return (data: SendFileUploadComplete) => this.handleFileUploadComplete(data);
      default:
        return () => {};
    }
  }

  private handleError(data: ErrorResult): void {
    if (data.errorCode === SOCKET_ERROR_CODE.UNAUTHORIZED) {
      AuthSessionStorage.clear();
      destroyRealtimeClient();
      window.location.href = '/auth/signin';
    }
  }

  private async handleAckSendMessage(data: AckSendMessage): Promise<void> {
    const message = await MessageDB.getByClientMsgId(data.clientMsgId);
    if (!message) return;

    message.status = data.status === 'success' ? MessageStatus.success : MessageStatus.fail;
    await MessageDB.upsert(message);
    useMessageStore.getState().upsertMany(message.conversationId, [message]);
  }

  private async handleNewUpdateMessage(data: NewUpdateMessage): Promise<void> {
    if (data.messages.length > 0) {
      const messages = data.messages.map((msg) => messageService.toLocalMessage(msg));
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

    if (data.conversations.length > 0) {
      const conversations = data.conversations.map((conversation) =>
        conversationService.toLocalConversation(conversation),
      );
      await ConversationDB.upsertMany(conversations);
      useConversationStore.getState().upsertMany(conversations);
    }

    if (data.removedConversationIds && data.removedConversationIds.length > 0) {
      await Promise.all(data.removedConversationIds.map((id) => ConversationDB.delete(id)));
      useConversationStore.getState().removeConversations(data.removedConversationIds);
    }
  }

  private async handleNewConversation(data: ConversationInfo): Promise<void> {
    const conversation = conversationService.toLocalConversation(data);
    await ConversationDB.upsert(conversation);
    useConversationStore.getState().upsertConversation(conversation);
  }

  private async handleFileUploadComplete(data: SendFileUploadComplete): Promise<void> {
    const { uploadId, fileId } = data;
    if (!uploadId || !fileId) return;

    const task = await UploadTaskDB.getByUploadId(uploadId);
    if (!task) return;

    await UploadTaskDB.upsert({
      ...task,
      status: 'completed',
      updatedAt: Date.now(),
    });

    if (!task.clientMsgId) return;

    const message = await MessageDB.getByClientMsgId(task.clientMsgId);
    if (!message) return;

    const nextMessage = {
      ...message,
      fileId,
      status: MessageStatus.success,
      type: (task.messageType ?? message.type) as MessageType,
    };

    await MessageDB.upsert(nextMessage);
    useMessageStore.getState().upsertMany(nextMessage.conversationId, [nextMessage]);
  }
}

export const realtimeListenersService = new RealtimeListenersService();
