import { create } from 'zustand';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { getDateKey } from '@c_chat/shared-utils';

interface MessageStoreData {
  /** 数据所属ID */
  dataConversationId: string;
  // clientMsgId | mediaGroupId -> message[]
  msgMap: Record<string, LocalMessageListItem[]>;
  // dateKey -> clientMsgId | mediaGroupId
  groups: Map<string, string[]>;
}

export interface MessageStoreType extends MessageStoreData {
  setDataConversationId: (conversationId: string) => void;
  updateMsg: (newMsg: LocalMessageListItem) => void;
  updateMsgs: (newMsgs: LocalMessageListItem[]) => void;
  addMsgList: (msgs: LocalMessageListItem[], mode?: 'history' | 'realtime') => void;
  clear: () => void;
}

export const useMessageStore = create<MessageStoreType>((set) => ({
  dataConversationId: '',
  msgMap: {},
  groups: new Map(),

  clear() {
    set({ msgMap: {}, groups: new Map() });
  },
  setDataConversationId(conversationId) {
    set({ dataConversationId: conversationId });
  },

  addMsgList(msgs, mode = 'realtime') {
    if (!msgs.length) return;

    set((state) => {
      const groups = new Map(state.groups);

      const msgMap = { ...state.msgMap };

      for (const msg of msgs) {
        const key = msg.mediaGroupId || msg.clientMsgId;
        const oldGroup = msgMap[key] ?? [];
        const index = oldGroup.findIndex((m) => m.clientMsgId === msg.clientMsgId);
        let newGroup = oldGroup;

        if (index === -1) {
          newGroup = mode === 'realtime' ? [msg, ...oldGroup] : [...oldGroup, msg];
        }
        msgMap[key] = newGroup;

        const dateKey = getDateKey(msg.createTime);

        let group = groups.get(dateKey);

        if (!group) {
          group = [];
        }

        const exists = group.some((arr) => arr.includes(key));

        if (!exists) {
          group = mode === 'realtime' ? [key, ...group] : [...group, key];
        }
        groups.set(dateKey, group);
      }

      return { groups, msgMap };
    });
  },

  updateMsg(newMsg) {
    set((state) => {
      const key = newMsg.mediaGroupId || newMsg.clientMsgId;
      const oldKey = Object.keys(state.msgMap).find((itemKey) =>
        state.msgMap[itemKey]?.some((msg) => msg.clientMsgId === newMsg.clientMsgId),
      );
      const newMsgMapItem = [...(state.msgMap[oldKey ?? key] ?? [])];
      const index = newMsgMapItem.findIndex((msg) => msg.clientMsgId === newMsg.clientMsgId);
      if (index === -1) {
        newMsgMapItem.push(newMsg);
      } else {
        newMsgMapItem[index] = { ...newMsgMapItem[index], ...newMsg };
      }

      const nextMsgMap = { ...state.msgMap };
      if (oldKey && oldKey !== key) {
        delete nextMsgMap[oldKey];
      }
      nextMsgMap[key] = newMsgMapItem.sort((a, b) => b.msgId! - a.msgId!);

      return {
        msgMap: nextMsgMap,
      };
    });
  },

  updateMsgs(msgs) {
    set((state) => {
      const nextMsgMap = { ...state.msgMap };
      const nextGroups = new Map(state.groups);

      for (const newMsg of msgs) {
        const key = newMsg.mediaGroupId || newMsg.clientMsgId;
        const oldKey = Object.keys(nextMsgMap).find((itemKey) =>
          nextMsgMap[itemKey]?.some((msg) => msg.clientMsgId === newMsg.clientMsgId),
        );

        const currentList = [...(nextMsgMap[oldKey ?? key] ?? [])];

        const index = currentList.findIndex((msg) => msg.clientMsgId === newMsg.clientMsgId);

        if (index === -1) {
          currentList.push(newMsg);
        } else {
          currentList[index] = {
            ...currentList[index],
            ...newMsg,
          };
        }

        currentList.sort((a, b) => (b.msgId ?? 0) - (a.msgId ?? 0));

        if (oldKey && oldKey !== key) {
          delete nextMsgMap[oldKey];
          for (const [dateKey, group] of nextGroups.entries()) {
            if (group.includes(oldKey)) {
              nextGroups.set(
                dateKey,
                Array.from(
                  new Set(group.map((groupKey) => (groupKey === oldKey ? key : groupKey))),
                ),
              );
            }
          }
        }

        nextMsgMap[key] = currentList;
      }

      return {
        msgMap: nextMsgMap,
        groups: nextGroups,
      };
    });
  },
}));
