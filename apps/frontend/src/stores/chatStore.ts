import { create } from 'zustand';
import type {
  LocalConversationListItem,
  LocalMessageListItem,
  SocketTypes,
  UserTypes,
} from '@c_chat/shared-types';
import { DEFAULT_LIST_DATA } from '@c_chat/shared-config';
type SetStateType<T> = (data?: T | ((state: T) => T)) => void;

interface ChatStoreData {
  conversationData: SocketTypes.ResponseList<LocalConversationListItem>;
  selectedConversation: LocalConversationListItem | null;
  selectedUserForDraft: UserTypes.UserListItem | null;
  messageData: SocketTypes.ResponseList<LocalMessageListItem>;
}

export interface ChatStoreType extends ChatStoreData {
  setConversationData: SetStateType<ChatStoreData['conversationData']>;
  setSelectedConversation: SetStateType<ChatStoreData['selectedConversation']>;
  setSelectedUserForDraft: SetStateType<ChatStoreData['selectedUserForDraft']>;
  setMessageData: SetStateType<ChatStoreData['messageData']>;
  addMessage: (message: LocalMessageListItem) => void;
  updateConversationSnapshot: (
    conversationId: string,
    lastMsgContent: string,
    lastMsgTime: number,
  ) => void;
  increaseUnreadCount: (conversationId: string) => void;
  clearUnreadCount: (conversationId: string) => void;
}

type SetData = <T extends keyof ChatStoreData>(
  key: T,
  data: Parameters<SetStateType<ChatStoreData[T]>>[0],
) => void;

/** 全局状态 */
export const useChatStore = create<ChatStoreType>((set) => {
  const setData: SetData = (key, data) => {
    if (data instanceof Function) {
      set((state) => ({ [key]: data(state[key]) }));
      return;
    }
    set({ [key]: data });
  };

  return {
    conversationData: DEFAULT_LIST_DATA,
    messageData: DEFAULT_LIST_DATA,
    selectedConversation: null,
    selectedUserForDraft: null,

    setConversationData(data) {
      setData('conversationData', data);
    },
    setSelectedConversation(data) {
      setData('selectedConversation', data);
    },
    setSelectedUserForDraft(data) {
      setData('selectedUserForDraft', data ?? null);
      if (data) {
        setData('selectedConversation', null);
      }
    },
    setMessageData(data = DEFAULT_LIST_DATA) {
      setData('messageData', data);
    },
    addMessage(message) {
      set((state) => {
        // 防止重复消息（通过id去重）
        if (state.messageData.list.some((m) => m.id === message.id)) {
          return state;
        }
        return {
          messageData: {
            ...state.messageData,
            list: [...state.messageData.list, message],
          },
        };
      });
    },
    updateConversationSnapshot(conversationId, lastMsgContent, lastMsgTime) {
      set((state) => ({
        conversationData: {
          ...state.conversationData,
          list: state.conversationData.list.map((c) =>
            c.id === conversationId
              ? { ...c, lastMsgContent, lastMsgTime, unreadCount: (c.unreadCount || 0) + 1 }
              : c,
          ),
        },
      }));
    },
    increaseUnreadCount(conversationId) {
      set((state) => ({
        conversationData: {
          ...state.conversationData,
          list: state.conversationData.list.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c,
          ),
        },
      }));
    },
    clearUnreadCount(conversationId) {
      set((state) => ({
        conversationData: {
          ...state.conversationData,
          list: state.conversationData.list.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
        },
      }));
    },
  };
});
