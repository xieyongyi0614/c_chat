import { create } from 'zustand';
import type { LocalMessageListItem } from '@c_chat/shared-types';

interface MessageState {
  currentConversationId: string | null;
  messages: LocalMessageListItem[];
  setConversationMessages: (conversationId: string, messages: LocalMessageListItem[]) => void;
  upsertMany: (conversationId: string, messages: LocalMessageListItem[]) => void;
  prependOlder: (conversationId: string, messages: LocalMessageListItem[]) => void;
  clear: () => void;
}

const orderTime = (message: LocalMessageListItem): number =>
  message.seq > BigInt(0) ? Number(message.seq) : message.localTime || message.createTime;

const sortMessages = (messages: LocalMessageListItem[]): LocalMessageListItem[] =>
  [...messages].sort((a, b) => orderTime(a) - orderTime(b));

const mergeMessages = (
  current: LocalMessageListItem[],
  incoming: LocalMessageListItem[],
): LocalMessageListItem[] => {
  const byKey = new Map<string, LocalMessageListItem>();
  const keyOf = (m: LocalMessageListItem): string => (m.clientMsgId ? m.clientMsgId : m.id);

  for (const message of current) {
    byKey.set(keyOf(message), message);
  }

  for (const message of incoming) {
    const key = keyOf(message);
    byKey.set(key, message);
    // 服务端确认后 pending(以 clientMsgId 为 key) 与 id 可能重复，按 id 去重
    if (message.id !== key) {
      byKey.delete(message.id);
    }
  }

  const deduped = new Map<string, LocalMessageListItem>();
  for (const message of byKey.values()) {
    deduped.set(message.id, message);
  }

  return sortMessages([...deduped.values()]);
};

export const useMessageStore = create<MessageState>((set) => ({
  currentConversationId: null,
  messages: [],

  setConversationMessages: (conversationId, messages) =>
    set({ currentConversationId: conversationId, messages: sortMessages(messages) }),

  upsertMany: (conversationId, messages) =>
    set((state) => {
      if (state.currentConversationId !== conversationId) return state;
      return { messages: mergeMessages(state.messages, messages) };
    }),

  prependOlder: (conversationId, messages) =>
    set((state) => {
      if (state.currentConversationId !== conversationId) return state;
      return { messages: mergeMessages(messages, state.messages) };
    }),

  clear: () => set({ currentConversationId: null, messages: [] }),
}));

export interface GroupedMessageItem {
  message: LocalMessageListItem;
  showSender: boolean;
}

export interface MessageDateGroup {
  dateKey: string;
  dateLabel: string;
  items: GroupedMessageItem[];
}

const dateKeyOf = (timestamp: number): string => new Date(timestamp).toISOString().slice(0, 10);

const dateLabelOf = (timestamp: number): string => {
  const target = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const key = dateKeyOf(timestamp);
  if (key === dateKeyOf(today.getTime())) return '今天';
  if (key === dateKeyOf(yesterday.getTime())) return '昨天';
  return `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`;
};

export const selectGroupedMessages = (state: MessageState): MessageDateGroup[] => {
  const groups: MessageDateGroup[] = [];

  state.messages.forEach((message, index) => {
    const timestamp = message.createTime || message.localTime;
    const dateKey = dateKeyOf(timestamp);
    let group = groups.at(-1);

    if (!group || group.dateKey !== dateKey) {
      group = { dateKey, dateLabel: dateLabelOf(timestamp), items: [] };
      groups.push(group);
    }

    const previous = state.messages[index - 1];
    const sameSenderAsPrevious =
      Boolean(previous) &&
      previous.senderId === message.senderId &&
      dateKeyOf(previous.createTime || previous.localTime) === dateKey;

    group.items.push({ message, showSender: !sameSenderAsPrevious });
  });

  return groups;
};
