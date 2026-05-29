import { create } from 'zustand';
import type { LocalMessageListItem } from '@c_chat/shared-types';

interface MessageState {
  messagesByConversation: Record<string, LocalMessageListItem[]>;
  setMessages: (conversationId: string, messages: LocalMessageListItem[]) => void;
  addMessage: (conversationId: string, message: LocalMessageListItem) => void;
  updateMessage: (conversationId: string, message: LocalMessageListItem) => void;
  clearMessages: (conversationId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByConversation: {},

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [
          ...(state.messagesByConversation[conversationId] || []),
          message,
        ],
      },
    })),

  updateMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (state.messagesByConversation[conversationId] || []).map((m) =>
          m.id === message.id || m.clientMsgId === message.clientMsgId ? message : m
        ),
      },
    })),

  clearMessages: (conversationId) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [],
      },
    })),
}));
