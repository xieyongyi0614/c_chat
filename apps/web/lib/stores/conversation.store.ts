import { create } from 'zustand';
import type { LocalConversationListItem } from '@c_chat/shared-types';

export type ConversationFolder = 'all' | 'unread' | 'personal' | 'groups' | 'archive';

interface ConversationState {
  conversations: LocalConversationListItem[];
  selectedConversationId: string | null;
  selectedFolder: ConversationFolder;
  setConversations: (conversations: LocalConversationListItem[]) => void;
  addConversation: (conversation: LocalConversationListItem) => void;
  updateConversation: (conversation: LocalConversationListItem) => void;
  selectConversation: (id: string | null) => void;
  setFolder: (folder: ConversationFolder) => void;
  getFilteredConversations: () => LocalConversationListItem[];
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  selectedFolder: 'all',

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

  setFolder: (folder) => set({ selectedFolder: folder }),

  getFilteredConversations: () => {
    const { conversations, selectedFolder } = get();

    switch (selectedFolder) {
      case 'unread':
        return conversations.filter((c) => (c.unreadCount || 0) > 0);
      case 'personal':
        return conversations.filter((c) => c.type === 1);
      case 'groups':
        return conversations.filter((c) => c.type === 2);
      case 'archive':
        return [];
      default:
        return conversations;
    }
  },
}));
