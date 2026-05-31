import { create } from 'zustand';
import { ConversationType, type LocalConversationListItem } from '@c_chat/shared-types';

export type ConversationFolder = 'all' | 'unread' | 'private' | 'group';

interface ConversationState {
  conversations: LocalConversationListItem[];
  selectedConversationId: string | null;
  folder: ConversationFolder;
  loading: boolean;
  error: string | null;
  setConversations: (conversations: LocalConversationListItem[]) => void;
  upsertConversation: (conversation: LocalConversationListItem) => void;
  upsertMany: (conversations: LocalConversationListItem[]) => void;
  removeConversations: (ids: string[]) => void;
  clearUnread: (id: string) => void;
  setFolder: (folder: ConversationFolder) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectConversation: (id: string | null) => void;
}

const sortByUpdateTimeDesc = (
  conversations: LocalConversationListItem[],
): LocalConversationListItem[] => [...conversations].sort((a, b) => b.updateTime - a.updateTime);

const mergeById = (
  current: LocalConversationListItem[],
  incoming: LocalConversationListItem[],
): LocalConversationListItem[] => {
  const map = new Map(current.map((c) => [c.id, c]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return sortByUpdateTimeDesc([...map.values()]);
};

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  folder: 'all',
  loading: false,
  error: null,

  setConversations: (conversations) => set({ conversations: sortByUpdateTimeDesc(conversations) }),

  upsertConversation: (conversation) =>
    set((state) => ({ conversations: mergeById(state.conversations, [conversation]) })),

  upsertMany: (conversations) =>
    set((state) => ({ conversations: mergeById(state.conversations, conversations) })),

  removeConversations: (ids) =>
    set((state) => {
      const removed = new Set(ids);
      return { conversations: state.conversations.filter((c) => !removed.has(c.id)) };
    }),

  clearUnread: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    })),

  setFolder: (folder) => set({ folder }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  selectConversation: (id) => set({ selectedConversationId: id }),
}));

export const selectVisibleConversations = (
  state: ConversationState,
): LocalConversationListItem[] => {
  switch (state.folder) {
    case 'unread':
      return state.conversations.filter((c) => (c.unreadCount ?? 0) > 0);
    case 'private':
      return state.conversations.filter((c) => c.type === ConversationType.Single);
    case 'group':
      return state.conversations.filter((c) => c.type === ConversationType.Group);
    default:
      return state.conversations;
  }
};
