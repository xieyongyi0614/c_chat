import { create } from 'zustand';
import type {
  LocalConversationListItem,
  LocalMessageListItem,
  SocketTypes,
  UserTypes,
} from '@c_chat/shared-types';
import { DEFAULT_LIST_DATA } from '@c_chat/shared-config';

export interface ChatState {
  conversationData: SocketTypes.ResponseList<LocalConversationListItem>;
  selectedConversation: LocalConversationListItem | null;
  selectedUserForDraft: UserTypes.UserListItem | null;
  messageData: SocketTypes.ResponseList<LocalMessageListItem>;
  setConversationData: (data: ChatState['conversationData']) => void;
  setSelectedConversation: (data?: ChatState['selectedConversation']) => void;
  setSelectedUserForDraft: (data?: ChatState['selectedUserForDraft']) => void;
  setMessageData: (
    data?:
      | ChatState['messageData']
      | ((state: ChatState['messageData']) => ChatState['messageData']),
  ) => void;
}

/** 全局状态 */
export const useChatStore = create<ChatState>((set) => ({
  conversationData: DEFAULT_LIST_DATA,
  messageData: DEFAULT_LIST_DATA,
  selectedConversation: null,
  selectedUserForDraft: null,

  setConversationData(data) {
    set({ conversationData: data });
  },
  setSelectedConversation(data) {
    set({ selectedConversation: data });
  },
  setSelectedUserForDraft(data) {
    set({ selectedUserForDraft: data ?? null, ...(data && { selectedConversation: null }) });
  },
  setMessageData(data) {
    if (!data) {
      set({ messageData: DEFAULT_LIST_DATA });
      return;
    }
    if (data instanceof Function) {
      set((state) => ({ messageData: data(state.messageData) }));
      return;
    }
    set({ messageData: data });
  },
}));
