import { create } from 'zustand';
import type { LocalConversationListItem, SocketTypes, UserTypes } from '@c_chat/shared-types';
import { DEFAULT_LIST_DATA } from '@c_chat/shared-config';
import { ipc, to } from '@c_chat/shared-utils';
type SetStateType<T> = (data?: T | ((state: T) => T)) => void;

interface ChatStoreData {
  conversationData: SocketTypes.ResponseList<LocalConversationListItem>;
  selectedConversation: LocalConversationListItem | null;
  selectedUserForDraft: UserTypes.UserListItem | null;
  selectedConversationFolder: 'all' | 'unread' | 'personal' | 'groups' | 'archive';
}

export interface ChatStoreType extends ChatStoreData {
  setConversationData: SetStateType<ChatStoreData['conversationData']>;
  setSelectedConversation: SetStateType<ChatStoreData['selectedConversation']>;
  setSelectedUserForDraft: SetStateType<ChatStoreData['selectedUserForDraft']>;
  setSelectedConversationFolder: SetStateType<ChatStoreData['selectedConversationFolder']>;

  upsertAndPinConversation: (conversation: LocalConversationListItem) => void;
  removeConversation: (conversationId: string) => void;

  markConversationAsRead: (conversationId: string) => Promise<void>;
}

const markReadInFlight = new Set<string>();

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
    selectedConversationFolder: 'all',

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
    setSelectedConversationFolder(data) {
      setData('selectedConversationFolder', data ?? 'all');
    },

    upsertAndPinConversation(conversation) {
      let shouldMarkRead = false;
      set((state) => {
        const current = state.conversationData.list.find((item) => item.id === conversation.id);
        let mergedConversation = current ? { ...current, ...conversation } : conversation;

        const isActive = state.selectedConversation?.id === conversation.id;
        if (isActive && (mergedConversation.unreadCount ?? 0) > 0) {
          mergedConversation = { ...mergedConversation, unreadCount: 0 };
          shouldMarkRead = true;
        }

        return {
          conversationData: {
            ...state.conversationData,
            list: pinConversation(state.conversationData.list, mergedConversation),
          },
          selectedConversation: isActive ? mergedConversation : state.selectedConversation,
        };
      });
      if (shouldMarkRead) {
        get().markConversationAsRead(conversation.id);
      }
    },
    removeConversation(conversationId) {
      set((state) => ({
        conversationData: {
          ...state.conversationData,
          list: state.conversationData.list.filter((item) => item.id !== conversationId),
        },
        selectedConversation:
          state.selectedConversation?.id === conversationId ? null : state.selectedConversation,
      }));
    },

    async markConversationAsRead(conversationId) {
      if (markReadInFlight.has(conversationId)) return;
      markReadInFlight.add(conversationId);

      set((state) => {
        const list = state.conversationData.list;
        const index = list.findIndex((item) => item.id === conversationId);
        if (index === -1 || !list[index].unreadCount) return state;
        const newList = [...list];
        newList[index] = { ...newList[index], unreadCount: 0 };
        return {
          conversationData: { ...state.conversationData, list: newList },
          selectedConversation:
            state.selectedConversation?.id === conversationId
              ? newList[index]
              : state.selectedConversation,
        };
      });

      const [err, res] = await to(ipc.ReadMessage({ conversationId }));
      markReadInFlight.delete(conversationId);
      if (err) {
        console.error('markConversationAsRead failed:', err);
        return;
      }

      set((state) => {
        const list = state.conversationData.list;
        const index = list.findIndex((item) => item.id === conversationId);
        if (index === -1) return state;
        const newList = [...list];
        newList[index] = {
          ...newList[index],
          unreadCount: res.unreadCount,
          lastReadMessageId: res.messageId ?? newList[index].lastReadMessageId ?? 0,
        };
        return {
          conversationData: { ...state.conversationData, list: newList },
          selectedConversation:
            state.selectedConversation?.id === conversationId
              ? newList[index]
              : state.selectedConversation,
        };
      });
    },
  };
});
