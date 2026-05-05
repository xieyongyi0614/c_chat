import { create } from 'zustand';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { getDateKey } from '@c_chat/shared-utils';

export type MessageGroup = {
  dateKey: string;
  messages: LocalMessageListItem[];
};

interface MessageStoreData {
  groups: MessageGroup[];
  msgMap: Record<string, LocalMessageListItem>;
}

export interface MessageStoreType extends MessageStoreData {
  updateMsg: (newMsg: LocalMessageListItem) => void;
  addMsg: (message: LocalMessageListItem) => void;
  addMsgList: (msgs: LocalMessageListItem[]) => void;
}

/** 消息状态数据 */
export const useMessageStore = create<MessageStoreType>((set) => {
  return {
    groups: [],
    msgMap: {},

    addMsg(msg) {
      set((state) => {
        const dateKey = getDateKey(msg.createTime);

        const groups = [...state.groups];
        const lastGroup = groups[0];

        if (lastGroup && lastGroup.dateKey === dateKey) {
          const newGroup = { ...lastGroup, messages: [msg, ...lastGroup.messages] };
          groups[0] = newGroup;
        } else {
          groups.unshift({ dateKey, messages: [msg] });
        }

        return {
          groups,
          msgMap: {
            ...state.msgMap,
            [msg.clientMsgId]: msg,
          },
        };
      });
    },

    addMsgList(msgs) {
      set((state) => {
        if (!msgs.length) return state;

        const sortedMsgs = [...msgs].sort((a, b) => Number(a.createTime) - Number(b.createTime));

        const groups = [...state.groups];
        const msgMap = { ...state.msgMap };

        for (const msg of sortedMsgs) {
          const dateKey = getDateKey(msg.createTime);
          const firstGroup = groups[0];

          if (firstGroup && firstGroup.dateKey === dateKey) {
            firstGroup.messages.unshift(msg);
          } else {
            groups.unshift({
              dateKey,
              messages: [msg],
            });
          }

          msgMap[msg.clientMsgId] = msg;
        }

        return { groups, msgMap };
      });
    },
    updateMsg(newMsg) {
      set((state) => {
        const groups = [...state.groups];

        for (let i = 0; i < groups.length; i++) {
          const group = groups[i];

          const msgIndex = group.messages.findIndex((m) => m.clientMsgId === newMsg.clientMsgId);

          if (msgIndex !== -1) {
            const newMessages = [...group.messages];

            newMessages[msgIndex] = {
              ...newMessages[msgIndex],
              ...newMsg,
            };

            groups[i] = {
              ...group,
              messages: newMessages,
            };

            break;
          }
        }

        // 合并已有 msgMap 条目，支持部分更新
        const existing = state.msgMap[newMsg.clientMsgId];

        return {
          groups,
          msgMap: {
            ...state.msgMap,
            [newMsg.clientMsgId]: existing ? { ...existing, ...newMsg } : newMsg,
          },
        };
      });
    },
  };
});
