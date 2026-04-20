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
  upsertAndPinConversation: (conversation: LocalConversationListItem) => void;
  applyConversationReadState: (payload: {
    conversationId: string;
    unreadCount: number;
    lastReadMessageId: number;
  }) => void;
  markActiveConversationRead: (conversationId: string, messageId: number) => void;
  increaseUnreadCount: (conversationId: string) => void;
  clearUnreadCount: (conversationId: string) => void;
}

type SetData = <T extends keyof ChatStoreData>(
  key: T,
  data: Parameters<SetStateType<ChatStoreData[T]>>[0],
) => void;

/** 全局状态 */
export const useChatStore = create<ChatStoreType>((set) => {
  const pinConversation = (
    list: LocalConversationListItem[],
    conversation: LocalConversationListItem,
  ): LocalConversationListItem[] => {
    const nextList = list.filter((item) => item.id !== conversation.id);
    nextList.unshift(conversation);
    return nextList;
  };

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
      set((state) => {
        const index = state.conversationData.list.findIndex((c) => c.id === conversationId);
        if (index === -1) return state;
        const updatedConversation = {
          ...state.conversationData.list[index],
          lastMsgContent,
          lastMsgTime,
          unreadCount: (state.conversationData.list[index].unreadCount || 0) + 1,
        };
        const nextList = [...state.conversationData.list];
        nextList.splice(index, 1);
        nextList.unshift(updatedConversation);
        return {
          conversationData: {
            ...state.conversationData,
            list: nextList,
          },
        };
      });
    },
    upsertAndPinConversation(conversation) {
      set((state) => {
        const current = state.conversationData.list.find((item) => item.id === conversation.id);
        const mergedConversation = current ? { ...current, ...conversation } : conversation;
        return {
          conversationData: {
            ...state.conversationData,
            list: pinConversation(state.conversationData.list, mergedConversation),
          },
          selectedConversation:
            state.selectedConversation?.id === conversation.id
              ? mergedConversation
              : state.selectedConversation,
        };
      });
    },
    applyConversationReadState({ conversationId, unreadCount, lastReadMessageId }) {
      set((state) => {
        let updatedSelected = state.selectedConversation;
        const nextList = state.conversationData.list.map((item) => {
          if (item.id !== conversationId) return item;
          const updated = {
            ...item,
            unreadCount,
            lastReadMessageId,
          };
          if (updatedSelected?.id === conversationId) {
            updatedSelected = updated;
          }
          return updated;
        });
        return {
          conversationData: {
            ...state.conversationData,
            list: nextList,
          },
          selectedConversation: updatedSelected,
        };
      });
    },
    markActiveConversationRead(conversationId, messageId) {
      set((state) => {
        let updatedSelected = state.selectedConversation;
        const nextList = state.conversationData.list.map((item) => {
          if (item.id !== conversationId) return item;
          const updated = {
            ...item,
            unreadCount: 0,
            lastReadMessageId: messageId,
          };
          if (updatedSelected?.id === conversationId) {
            updatedSelected = updated;
          }
          return updated;
        });
        return {
          conversationData: {
            ...state.conversationData,
            list: nextList,
          },
          selectedConversation: updatedSelected,
        };
      });
    },
    increaseUnreadCount(conversationId) {
      set((state) => {
        let updatedSelected = state.selectedConversation;
        const nextList = state.conversationData.list.map((c) => {
          if (c.id !== conversationId) return c;
          const updated = { ...c, unreadCount: (c.unreadCount || 0) + 1 };
          if (updatedSelected?.id === conversationId) {
            updatedSelected = updated;
          }
          return updated;
        });
        return {
          conversationData: {
            ...state.conversationData,
            list: nextList,
          },
          selectedConversation: updatedSelected,
        };
      });
    },
    clearUnreadCount(conversationId) {
      set((state) => {
        let updatedSelected = state.selectedConversation;
        const nextList = state.conversationData.list.map((c) => {
          if (c.id !== conversationId) return c;
          const updated = { ...c, unreadCount: 0 };
          if (updatedSelected?.id === conversationId) {
            updatedSelected = updated;
          }
          return updated;
        });
        return {
          conversationData: {
            ...state.conversationData,
            list: nextList,
          },
          selectedConversation: updatedSelected,
        };
      });
    },
  };
});
