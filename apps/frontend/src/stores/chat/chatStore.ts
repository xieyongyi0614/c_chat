import { create } from 'zustand';
import type { LocalConversationListItem, SocketTypes, UserTypes } from '@c_chat/shared-types';
import { DEFAULT_LIST_DATA } from '@c_chat/shared-config';
import { ipc, to } from '@c_chat/shared-utils';
type SetStateType<T> = (data?: T | ((state: T) => T)) => void;

interface ChatStoreData {
  conversationData: SocketTypes.ResponseList<LocalConversationListItem>;
  selectedConversation: LocalConversationListItem | null;
  selectedUserForDraft: UserTypes.UserListItem | null;
}

export interface ChatStoreType extends ChatStoreData {
  setConversationData: SetStateType<ChatStoreData['conversationData']>;
  setSelectedConversation: SetStateType<ChatStoreData['selectedConversation']>;
  setSelectedUserForDraft: SetStateType<ChatStoreData['selectedUserForDraft']>;

  updateConversationSnapshot: (
    conversationId: string,
    lastMsgContent: string,
    lastMsgTime: number,
  ) => void;
  upsertAndPinConversation: (conversation: LocalConversationListItem) => void;

  markConversationAsRead: (conversationId: string) => Promise<void>;
}

type SetData = <T extends keyof ChatStoreData>(
  key: T,
  data: Parameters<SetStateType<ChatStoreData[T]>>[0],
) => void;

/** 全局状态 */
export const useChatStore = create<ChatStoreType>((set, get) => {
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
    selectedConversation: null,
    selectedUserForDraft: null,

    setConversationData(data) {
      setData('conversationData', data);
    },
    setSelectedConversation(data) {
      setData('selectedConversation', data);
      if (data) {
        setData('selectedUserForDraft', null);
      }
    },
    setSelectedUserForDraft(data) {
      setData('selectedUserForDraft', data ?? null);
      if (data) {
        setData('selectedConversation', null);
      }
    },

    updateConversationSnapshot(conversationId, lastMsgContent, lastMsgTime) {
      set((state) => {
        const index = state.conversationData.list.findIndex((c) => c.id === conversationId);
        if (index === -1) return state;
        const isActiveConversation = state.selectedConversation?.id === conversationId;
        const updatedConversation = {
          ...state.conversationData.list[index],
          lastMsgContent,
          lastMsgTime,
          unreadCount:
            (state.conversationData.list[index].unreadCount || 0) + (isActiveConversation ? 0 : 1),
        };
        const nextList = [...state.conversationData.list];
        nextList.splice(index, 1);
        nextList.unshift(updatedConversation);
        if (isActiveConversation) {
          get().markConversationAsRead(conversationId);
        }
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

    async markConversationAsRead(conversationId) {
      const [err, res] = await to(ipc.ReadMessage({ conversationId }));
      if (err) {
        console.error('markConversationAsRead failed:', err);
        return;
      }

      set((state) => {
        const { conversationData } = state;
        const newList = [...conversationData.list];
        const index = newList.findIndex((item) => item.id === conversationId);
        if (index === -1) {
          return state;
        }

        newList[index] = {
          ...newList[index],
          unreadCount: res.unreadCount,
          lastReadMessageId: res.messageId ?? 0,
        };

        return {
          conversationData: {
            ...conversationData,
            list: newList,
          },
          selectedConversation: newList[index],
        };
      });
    },
  };
});
