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
  };
});
