import { useChatStore, useMessageStore } from '@c_chat/frontend/stores';
import { DEFAULT_MESSAGE_PAGE_SIZE } from '@c_chat/shared-config';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { ipc, to } from '@c_chat/shared-utils';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useConversationData } from './useConversationData';

interface HistoryState {
  isLoadingLatest: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
}

const INITIAL_HISTORY_STATE: HistoryState = {
  isLoadingLatest: false,
  isLoadingOlder: false,
  hasMoreOlder: false,
};

const getMsgIdRange = (messages: { seq?: bigint }[]) => {
  let oldest: bigint | null = null;
  let newest: bigint | null = null;
  for (const m of messages) {
    if (!m.seq) continue;
    if (oldest == null || m.seq < oldest) oldest = m.seq;
    if (newest == null || m.seq > newest) newest = m.seq;
  }
  return { oldest, newest };
};

const canUseLocalOlderMessages = (messages: LocalMessageListItem[], beforeMsgId: bigint) => {
  if (messages.length === 0) return false;
  const { oldest, newest } = getMsgIdRange(messages);
  return oldest != null && oldest < beforeMsgId && newest === beforeMsgId - 1n;
};

export const useChatsData = () => {
  const { conversationData, markConversationAsRead } = useChatStore();
  const selectedConversationId = useChatStore((s) => s.selectedConversation?.id);
  const unreadCount = useChatStore((s) => s.selectedConversation?.unreadCount);
  const { addMsgList, clear, setDataConversationId } = useMessageStore();
  const { fetchConversationData } = useConversationData();

  const [historyState, setHistoryState] = useState<HistoryState>(INITIAL_HISTORY_STATE);
  const historyRequestRef = useRef({ isLoadingOlder: false, hasMoreOlder: false });
  const remoteBeforeMsgIdRef = useRef<bigint | null>(null);

  const patchHistoryState = (patch: Partial<HistoryState>) => {
    setHistoryState((prev) => ({ ...prev, ...patch }));
  };

  const isStillActive = (conversationId: string) =>
    useMessageStore.getState().dataConversationId === conversationId;

  const fetchLocalMessageHistory = async (conversationId: string) => {
    const [err, res] = await to(ipc.GetLocalMessageHistory({ conversationId }));
    if (err) {
      console.log('获取本地消息失败:', err);
      toast.error('获取本地消息失败');
      return;
    }
    if (isStillActive(conversationId)) addMsgList(res, 'history');
  };

  const fetchLatestMessageHistory = async (conversationId: string) => {
    patchHistoryState({ isLoadingLatest: true, hasMoreOlder: false });

    const [err, res] = await to(
      ipc.GetMessageHistory({ conversationId, pageSize: DEFAULT_MESSAGE_PAGE_SIZE }),
    );
    if (err || !res) {
      console.log('fetchMessageHistory error', err);
      patchHistoryState({ isLoadingLatest: false });
      return;
    }
    if (isStillActive(conversationId)) {
      addMsgList(res, 'replaceDisconnectedHistory');
    }

    const { oldest } = getMsgIdRange(res);
    remoteBeforeMsgIdRef.current = oldest;
    const hasMoreOlder = Boolean(oldest) && res.length >= DEFAULT_MESSAGE_PAGE_SIZE;
    historyRequestRef.current.hasMoreOlder = hasMoreOlder;
    patchHistoryState({ isLoadingLatest: false, hasMoreOlder });
  };

  const loadOlderMessages = async () => {
    if (
      !selectedConversationId ||
      historyRequestRef.current.isLoadingOlder ||
      !historyRequestRef.current.hasMoreOlder
    ) {
      return false;
    }

    const beforeMsgId = remoteBeforeMsgIdRef.current;
    if (!beforeMsgId) {
      historyRequestRef.current.hasMoreOlder = false;
      patchHistoryState({ hasMoreOlder: false });
      return false;
    }

    historyRequestRef.current.isLoadingOlder = true;
    patchHistoryState({ isLoadingOlder: true });

    const pageParams = {
      conversationId: selectedConversationId,
      beforeMsgId: Number(beforeMsgId),
      pageSize: DEFAULT_MESSAGE_PAGE_SIZE,
    };
    const [localErr, localRes] = await to(ipc.GetLocalMessageHistory(pageParams));
    const shouldUseLocal = !localErr && canUseLocalOlderMessages(localRes ?? [], beforeMsgId);

    const [err, res] = shouldUseLocal
      ? ([null, localRes] as const)
      : await to(ipc.GetMessageHistory(pageParams));

    historyRequestRef.current.isLoadingOlder = false;

    if (err || !isStillActive(selectedConversationId)) {
      patchHistoryState({ isLoadingOlder: false });
      return false;
    }

    const messages = res ?? [];
    const { oldest } = getMsgIdRange(messages);

    if (oldest == null || oldest >= beforeMsgId) {
      historyRequestRef.current.hasMoreOlder = false;
      patchHistoryState({ isLoadingOlder: false, hasMoreOlder: false });
      return false;
    }

    if (messages.length > 0) addMsgList(messages, 'history');
    remoteBeforeMsgIdRef.current = oldest;

    const hasMoreOlder = shouldUseLocal || messages.length >= DEFAULT_MESSAGE_PAGE_SIZE;
    historyRequestRef.current.hasMoreOlder = hasMoreOlder;
    patchHistoryState({ isLoadingOlder: false, hasMoreOlder });
    return messages.length > 0;
  };

  useEffect(() => {
    if (!selectedConversationId) return;

    const shouldReload = useMessageStore.getState().dataConversationId !== selectedConversationId;
    if (shouldReload) {
      clear();
      setDataConversationId(selectedConversationId);
      remoteBeforeMsgIdRef.current = null;
      historyRequestRef.current = { isLoadingOlder: false, hasMoreOlder: false };
      setHistoryState(INITIAL_HISTORY_STATE);
    }
    fetchLocalMessageHistory(selectedConversationId);
    fetchLatestMessageHistory(selectedConversationId);
    if ((unreadCount ?? 0) > 0) {
      markConversationAsRead(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  return {
    conversationData,
    fetchConversationData,
    loadOlderMessages,
    historyState,
  };
};
