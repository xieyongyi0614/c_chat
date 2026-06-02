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
  if (msg.seq > 0n) return `server:${msg.conversationId}:${msg.seq}`;
  return `local:${msg.id}`;
};

const getMessageSortValue = (msg: LocalMessageListItem): bigint =>
  msg.seq > 0n ? msg.seq : BigInt(msg.createTime ?? 0);

const sortMessagesDesc = (messages: LocalMessageListItem[]) =>
  [...messages].sort((a, b) => {
    const av = getMessageSortValue(a);
    const bv = getMessageSortValue(b);
    return av === bv ? 0 : bv > av ? 1 : -1;
  });

const areSameItems = <T>(current: T[] | undefined, next: T[]) => {
  if (!current || current.length !== next.length) return false;

  return current.every((item, index) => item === next[index]);
};

type AddMessageMode = 'history' | 'realtime' | 'replaceDisconnectedHistory';

const getServerMsgIdRange = (messages: LocalMessageListItem[]) => {
  let min: bigint | null = null;
  let max: bigint | null = null;

  for (const msg of messages) {
    if (msg.seq <= 0n) continue;
    if (min == null || msg.seq < min) min = msg.seq;
    if (max == null || msg.seq > max) max = msg.seq;
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
    existingRange.max < incomingRange.min - 1n
  );
};

const rebuildMessageState = (
  msgMap: MessageStoreData['msgMap'],
  groups: MessageStoreData['groups'],
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

  const draftMsgMap: MessageStoreData['msgMap'] = {};
  const draftGroups = new Map<string, string[]>();
  const sortedMessages = sortMessagesDesc(Array.from(messageByIdentity.values()));

  for (const msg of sortedMessages) {
    const groupKey = msg.mediaGroupId || msg.clientMsgId || msg.id;
    const groupMessages = draftMsgMap[groupKey] ?? [];
    draftMsgMap[groupKey] = sortMessagesDesc([...groupMessages, msg]);

    const dateKey = getDateKey(msg.createTime);
    const dateGroup = draftGroups.get(dateKey) ?? [];
    if (!dateGroup.includes(groupKey)) {
      draftGroups.set(dateKey, [...dateGroup, groupKey]);
    }
  }

  const nextMsgMap = Object.fromEntries(
    Object.entries(draftMsgMap).map(([groupKey, messages]) => [
      groupKey,
      areSameItems(msgMap[groupKey], messages) ? msgMap[groupKey] : messages,
    ]),
  );
  const nextGroups = new Map(
    Array.from(draftGroups.entries()).map(([dateKey, groupIds]) => {
      const currentGroupIds = groups.get(dateKey);
      return [
        dateKey,
        currentGroupIds && areSameItems(currentGroupIds, groupIds) ? currentGroupIds : groupIds,
      ] as const;
    }),
  );

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
      return rebuildMessageState(state.msgMap, state.groups, msgs, mode);
    });
  },

  updateMsg(newMsg) {
    set((state) => {
      return rebuildMessageState(state.msgMap, state.groups, [newMsg]);
    });
  },

  updateMsgs(msgs) {
    set((state) => {
      return rebuildMessageState(state.msgMap, state.groups, msgs);
    });
  },
}));
