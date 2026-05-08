import { create } from 'zustand';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { getDateKey } from '@c_chat/shared-utils';

interface MessageStoreData {
  // clientMsgId | mediaGroupId -> message[]
  msgMap: Record<string, LocalMessageListItem[]>;
  // dateKey -> clientMsgId | mediaGroupId
  groups: Map<string, string[]>;
}

export interface MessageStoreType extends MessageStoreData {
  updateMsg: (newMsg: LocalMessageListItem) => void;
  addMsgList: (msgs: LocalMessageListItem[], mode?: 'history' | 'realtime') => void;
  clear: () => void;
}

export const useMessageStore = create<MessageStoreType>((set) => ({
  msgMap: {},
  groups: new Map(),

  clear() {
    set({ msgMap: {}, groups: new Map() });
  },

  addMsgList(msgs, mode = 'history') {
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

      const newMsgMapItem = [...(state.msgMap[key] ?? [])];
      const index = newMsgMapItem.findIndex((msg) => msg.clientMsgId === newMsg.clientMsgId);
      if (index === -1) {
        newMsgMapItem.push(newMsg);
      } else {
        newMsgMapItem[index] = { ...newMsgMapItem[index], ...newMsg };
      }

      return {
        msgMap: {
          ...state.msgMap,
          [key]: newMsgMapItem.sort((a, b) => b.msgId! - a.msgId!),
        },
      };
    });
  },
}));
