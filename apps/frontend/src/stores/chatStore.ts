import { create } from 'zustand';
import type {
  LocalConversationListItem,
  LocalMessageListItem,
  SocketTypes,
  UserTypes,
} from '@c_chat/shared-types';
import { DEFAULT_LIST_DATA } from '@c_chat/shared-config';
import { ipc, to } from '@c_chat/shared-utils';
import dayjs from 'dayjs';
type SetStateType<T> = (data?: T | ((state: T) => T)) => void;

interface ChatStoreData {
  conversationData: SocketTypes.ResponseList<LocalConversationListItem>;
  selectedConversation: LocalConversationListItem | null;
  selectedUserForDraft: UserTypes.UserListItem | null;
  messageData: SocketTypes.ResponseList<LocalMessageListItem>;

  // msgList: LocalMessageListItem[]; // 有序（时间升序）
  // msgMap: Record<string, LocalMessageListItem>; // 快速索引
  // msgGrouped: Record<string, LocalMessageListItem[]>; // 按天分组
}

export interface ChatStoreType extends ChatStoreData {
  setConversationData: SetStateType<ChatStoreData['conversationData']>;
  setSelectedConversation: SetStateType<ChatStoreData['selectedConversation']>;
  setSelectedUserForDraft: SetStateType<ChatStoreData['selectedUserForDraft']>;
  setMessageData: SetStateType<ChatStoreData['messageData']>;
  addMessage: (message: LocalMessageListItem) => void;
  // updateMsg: (newMsg: LocalMessageListItem) => void;
  // addMsg: (message: LocalMessageListItem) => void;
  // addMsgList: (msgs: LocalMessageListItem[]) => void;
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
    messageData: DEFAULT_LIST_DATA,
    selectedConversation: null,
    selectedUserForDraft: null,

    msgList: [],
    msgMap: {},
    msgGrouped: {},

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
    setMessageData(data = DEFAULT_LIST_DATA) {
      setData('messageData', data);
    },
    // updateMsg(newMsg) {
    //   set((state) => {
    //     const index = state.messageData.list.findIndex((m) => m.clientMsgId === newMsg.clientMsgId);
    //     if (index === -1) return state;
    //     const newList = [...state.messageData.list];
    //     newList[index] = newMsg;
    //     return {
    //       messageData: { ...state.messageData, list: newList },
    //     };
    //   });
    // },

    // updateMsg(newMsg) {
    //   set((state) => {
    //     const old = state.msgMap[newMsg.clientMsgId];
    //     if (!old) return state;

    //     // 1️⃣ 更新 map
    //     const newMap = {
    //       ...state.msgMap,
    //       [newMsg.clientMsgId]: newMsg,
    //     };

    //     // 2️⃣ 更新 list（只替换，不重建）
    //     const index = state.msgList.findIndex((m) => m.clientMsgId === newMsg.clientMsgId);

    //     const newList = [...state.msgList];
    //     newList[index] = {
    //       ...state.msgList[index],
    //       ...newMsg,
    //     };

    //     // 3️⃣ 更新 group（只更新对应那一天）
    //     // const dateKey = getDateKey(newMsg.createTime);
    //     const dateKey = dayjs(Number(newMsg.createTime)).format('D MMM, YYYY');

    //     const group = state.msgGrouped[dateKey];

    //     const newGroup = group.map((m) => (m.clientMsgId === newMsg.clientMsgId ? newMsg : m));

    //     const nextGrouped = {
    //       ...state.msgGrouped,
    //       [dateKey]: newGroup,
    //     };
    //     console.log(
    //       'grouped changed?',
    //       state.msgGrouped === nextGrouped, // 应该是 false
    //     );
    //     return {
    //       msgList: newList,
    //       msgMap: newMap,
    //       msgGrouped: nextGrouped,
    //     };
    //   });
    // },
    // addMsg(msg) {
    //   set((state) => {
    //     // 默认消息是按时间递增来的（IM 正常逻辑）
    //     const newList = [...state.msgList, msg];
    //     // const dateKey = getDateKey(msg.createTime);

    //     const dateKey = dayjs(Number(msg.createTime)).format('D MMM, YYYY');
    //     console.log(
    //       'msgList changed?',
    //       state.msgList === newList, // 应该是 false
    //     );
    //     return {
    //       msgList: newList,
    //       msgMap: {
    //         ...state.msgMap,
    //         [msg.clientMsgId]: msg,
    //       },
    //       msgGrouped: {
    //         ...state.msgGrouped,
    //         [dateKey]: [msg, ...(state.msgGrouped[dateKey] || [])],
    //       },
    //     };
    //   });
    // },

    // addMsgList(msgs: LocalMessageListItem[]) {
    //   set((state) => {
    //     if (!msgs.length) return state;

    //     // 1️⃣ 排序（只做一次）
    //     const sortedMsgs = [...msgs].sort((a, b) => a.msgId - b.msgId);

    //     // 2️⃣ 合并 list（假设是“加载历史” → 插前面）
    //     const newList = [...sortedMsgs, ...state.msgList];

    //     // 3️⃣ 构建 map（只处理新增部分）
    //     const newMap = { ...state.msgMap };
    //     for (const msg of sortedMsgs) {
    //       newMap[msg.clientMsgId] = msg;
    //     }

    //     // 4️⃣ 构建 grouped（关键优化点）
    //     const newGrouped = { ...state.msgGrouped };

    //     for (const msg of sortedMsgs) {
    //       // const dateKey = getDateKey(msg.createTime);
    //       const dateKey = dayjs(Number(msg.createTime)).format('D MMM, YYYY');

    //       if (!newGrouped[dateKey]) {
    //         newGrouped[dateKey] = [msg];
    //       } else {
    //         // ⚠️ 注意：历史消息 → 插前面
    //         newGrouped[dateKey] = [msg, ...newGrouped[dateKey]];
    //       }
    //     }

    //     return {
    //       msgList: newList,
    //       msgMap: newMap,
    //       msgGrouped: newGrouped,
    //     };
    //   });
    // },

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
