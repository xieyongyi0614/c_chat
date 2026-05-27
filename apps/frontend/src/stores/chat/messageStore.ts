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

const getMessageIdentity = (msg: LocalMessageListItem) => {
  if (msg.clientMsgId) return `client:${msg.clientMsgId}`;
  if (msg.seq) return `server:${msg.conversationId}:${msg.seq}`;
  return `local:${msg.id}`;
};

const getMessageSortValue = (msg: LocalMessageListItem) => msg.seq ?? msg.createTime ?? 0;

const sortMessagesDesc = (messages: LocalMessageListItem[]) =>
  [...messages].sort((a, b) => getMessageSortValue(b) - getMessageSortValue(a));

type AddMessageMode = 'history' | 'realtime' | 'replaceDisconnectedHistory';

const getServerMsgIdRange = (messages: LocalMessageListItem[]) => {
  let min: number | null = null;
  let max: number | null = null;

  for (const msg of messages) {
    if (!msg.seq) continue;
    min = min == null ? msg.seq : Math.min(min, msg.seq);
    max = max == null ? msg.seq : Math.max(max, msg.seq);
  }

  return { min, max };
};

const getMessagesFromMap = (msgMap: MessageStoreData['msgMap']) => Object.values(msgMap).flat();

const shouldReplaceDisconnectedHistory = (
  existing: LocalMessageListItem[],
  incoming: LocalMessageListItem[],
) => {
  const existingRange = getServerMsgIdRange(existing);
  const incomingRange = getServerMsgIdRange(incoming);

  return (
    existingRange.max != null &&
    incomingRange.min != null &&
    existingRange.max < incomingRange.min - 1
  );
};

const rebuildMessageState = (
  msgMap: MessageStoreData['msgMap'],
  incoming: LocalMessageListItem[],
  mode: AddMessageMode = 'history',
) => {
  const messageByIdentity = new Map<string, LocalMessageListItem>();
  const existingMessages = getMessagesFromMap(msgMap);
  const shouldDropExisting =
    mode === 'replaceDisconnectedHistory' &&
    shouldReplaceDisconnectedHistory(existingMessages, incoming);

  if (!shouldDropExisting) {
    for (const msg of existingMessages) {
      messageByIdentity.set(getMessageIdentity(msg), msg);
    }
  }

  for (const msg of incoming) {
    const identity = getMessageIdentity(msg);
    const oldMsg = messageByIdentity.get(identity);
    messageByIdentity.set(identity, oldMsg ? { ...oldMsg, ...msg } : msg);
  }

  const nextMsgMap: MessageStoreData['msgMap'] = {};
  const nextGroups = new Map<string, string[]>();
  const sortedMessages = sortMessagesDesc(Array.from(messageByIdentity.values()));

  for (const msg of sortedMessages) {
    const groupKey = msg.mediaGroupId || msg.clientMsgId || msg.id;
    const groupMessages = nextMsgMap[groupKey] ?? [];
    nextMsgMap[groupKey] = sortMessagesDesc([...groupMessages, msg]);

    const dateKey = getDateKey(msg.createTime);
    const dateGroup = nextGroups.get(dateKey) ?? [];
    if (!dateGroup.includes(groupKey)) {
      nextGroups.set(dateKey, [...dateGroup, groupKey]);
    }
  }

  return {
    msgMap: nextMsgMap,
    groups: nextGroups,
  };
};

export interface MessageStoreType extends MessageStoreData {
  setDataConversationId: (conversationId: string) => void;
  updateMsg: (newMsg: LocalMessageListItem) => void;
  updateMsgs: (newMsgs: LocalMessageListItem[]) => void;
  addMsgList: (msgs: LocalMessageListItem[], mode?: AddMessageMode) => void;
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

  addMsgList(msgs, mode) {
    if (!msgs.length) return;

    set((state) => {
      return rebuildMessageState(state.msgMap, msgs, mode);
    });
  },

  updateMsg(newMsg) {
    set((state) => {
      return rebuildMessageState(state.msgMap, [newMsg]);
    });
  },

  updateMsgs(msgs) {
    set((state) => {
      return rebuildMessageState(state.msgMap, msgs);
    });
  },
}));
