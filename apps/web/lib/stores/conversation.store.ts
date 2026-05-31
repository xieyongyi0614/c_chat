import { create } from 'zustand';
import type { LocalConversationListItem } from '@c_chat/shared-types';

interface ConversationState {
  conversations: LocalConversationListItem[];
  selectedConversationId: string | null;
  setConversations: (conversations: LocalConversationListItem[]) => void;
  addConversation: (conversation: LocalConversationListItem) => void;
  updateConversation: (conversation: LocalConversationListItem) => void;
  selectConversation: (id: string | null) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  selectedConversationId: null,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversation.id ? conversation : c
      ),
    })),

  selectConversation: (id) => set({ selectedConversationId: id }),
}));
