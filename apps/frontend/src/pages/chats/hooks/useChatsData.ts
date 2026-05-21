import { useChatStore, useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import { DEFAULT_MESSAGE_PAGE_SIZE } from '@c_chat/shared-config';
import type {
  GetConversationListParams,
  GetLocalConversationListParams,
  LocalMessageListItem,
} from '@c_chat/shared-types';
import { ipc, to, transformListParams } from '@c_chat/shared-utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const getOldestServerMsgId = (messages: { msgId?: number | null }[]) => {
  const msgIds = messages.map((msg) => msg.msgId).filter((msgId): msgId is number => !!msgId);
  return msgIds.length > 0 ? Math.min(...msgIds) : null;
};

const getNewestServerMsgId = (messages: { msgId?: number | null }[]) => {
  const msgIds = messages.map((msg) => msg.msgId).filter((msgId): msgId is number => !!msgId);
  return msgIds.length > 0 ? Math.max(...msgIds) : null;
};

const canUseLocalOlderMessages = (messages: LocalMessageListItem[], beforeMsgId: number) => {
  if (messages.length === 0) return false;

  const newestMsgId = getNewestServerMsgId(messages);
  const oldestMsgId = getOldestServerMsgId(messages);

  return oldestMsgId != null && oldestMsgId < beforeMsgId && newestMsgId === beforeMsgId - 1;
};

export const useChatsData = () => {
  const { userInfo } = useUserStore();
  const { conversationData, setConversationData, selectedConversation, markConversationAsRead } =
    useChatStore();
  const { addMsgList, clear, setDataConversationId } = useMessageStore();
  const [historyState, setHistoryState] = useState({
    isLoadingLatest: false,
    isLoadingOlder: false,
    hasMoreOlder: false,
  });
  const historyRequestRef = useRef({
    isLoadingOlder: false,
    hasMoreOlder: false,
  });
  const remoteBeforeMsgIdRef = useRef<number | null>(null);

  const fetchLocalConversationData = async (param?: GetLocalConversationListParams) => {
    const [err, res] = await to(ipc.GetLocalConversationList(param));
    if (err) {
      console.error('获取本地缓存会话列表失败:', err);
      toast.error('获取本地缓存会话列表失败');
      return;
    }

    if (res) {
      setConversationData(res);
      console.log('获取本地缓存会话列表成功:', res);
    }
  };
  const fetchConversationData = async (params?: GetConversationListParams) => {
    const newParams = transformListParams(params);
    const [err, res] = await to(ipc.GetConversationList(newParams));
    if (err) {
      console.error('Failed to fetch conversation list:', err);
      toast.error('获取会话列表失败');
      return;
    }

    if (res) {
      setConversationData(res);
      console.log('获取会话列表成功:', res);
    }
  };

  const fetchLocalMessageHistory = async (conversationId: string) => {
    const [err, res] = await to(ipc.GetLocalMessageHistory({ conversationId }));
    if (err) {
      toast.error('获取本地消息失败');
      console.log('获取本地消息失败:', err);
      return;
    }
    console.log('fetchLocalMessageHistory', res);

    if (useMessageStore.getState().dataConversationId === conversationId) {
      addMsgList(res, 'history');
    }
  };

  const fetchLatestMessageHistory = async (conversationId: string) => {
    setHistoryState((state) => ({ ...state, isLoadingLatest: true, hasMoreOlder: false }));

    const [err, res] = await to(
      ipc.GetMessageHistory({ conversationId, pageSize: DEFAULT_MESSAGE_PAGE_SIZE }),
    );
    if (err) {
      console.log('fetchMessageHistory error', err);
      setHistoryState((state) => ({ ...state, isLoadingLatest: false }));
      return;
    }
    if (res) {
      console.log('fetchMessageHistory', res);
      if (useMessageStore.getState().dataConversationId === conversationId) {
        addMsgList(res, 'replaceDisconnectedHistory');
      }
      const oldestMsgId = getOldestServerMsgId(res);
      remoteBeforeMsgIdRef.current = oldestMsgId;
      const hasMoreOlder = Boolean(oldestMsgId) && res.length >= DEFAULT_MESSAGE_PAGE_SIZE;
      historyRequestRef.current.hasMoreOlder = hasMoreOlder;
      setHistoryState((state) => ({
        ...state,
        isLoadingLatest: false,
        hasMoreOlder,
      }));
    }
  };

  const loadOlderMessages = useCallback(async () => {
    const conversationId = selectedConversation?.id;
    if (
      !conversationId ||
      historyRequestRef.current.isLoadingOlder ||
      !historyRequestRef.current.hasMoreOlder
    ) {
      return false;
    }

    const beforeMsgId = remoteBeforeMsgIdRef.current;
    if (!beforeMsgId) {
      historyRequestRef.current.hasMoreOlder = false;
      setHistoryState((state) => ({ ...state, hasMoreOlder: false }));
      return false;
    }

    historyRequestRef.current.isLoadingOlder = true;
    setHistoryState((state) => ({ ...state, isLoadingOlder: true }));

    const [localErr, localRes] = await to(
      ipc.GetLocalMessageHistory({
        conversationId,
        beforeMsgId,
        pageSize: DEFAULT_MESSAGE_PAGE_SIZE,
      }),
    );
    const shouldUseLocal = !localErr && canUseLocalOlderMessages(localRes ?? [], beforeMsgId);
    const source = shouldUseLocal ? 'local' : 'remote';
    if (shouldUseLocal) {
      console.log('请求本地数据');
    }
    const [err, res] = shouldUseLocal
      ? ([null, localRes] as const)
      : await to(
          ipc.GetMessageHistory({
            conversationId,
            beforeMsgId,
            pageSize: DEFAULT_MESSAGE_PAGE_SIZE,
          }),
        );

    historyRequestRef.current.isLoadingOlder = false;

    if (err) {
      console.log('loadOlderMessages error', err);
      setHistoryState((state) => ({ ...state, isLoadingOlder: false }));
      return false;
    }

    if (useMessageStore.getState().dataConversationId !== conversationId) {
      setHistoryState((state) => ({ ...state, isLoadingOlder: false }));
      return false;
    }

    const messages = res ?? [];
    const oldestMsgId = getOldestServerMsgId(messages);
    const newestMsgId = getNewestServerMsgId(messages);
    console.log('loadOlderMessages', {
      beforeMsgId,
      count: messages.length,
      newestMsgId,
      oldestMsgId,
    });

    if (oldestMsgId == null || oldestMsgId >= beforeMsgId) {
      historyRequestRef.current.hasMoreOlder = false;
      setHistoryState((state) => ({
        ...state,
        isLoadingOlder: false,
        hasMoreOlder: false,
      }));
      return false;
    }

    if (messages.length > 0) {
      addMsgList(messages, 'history');
    }

    remoteBeforeMsgIdRef.current = oldestMsgId;

    const hasMoreOlder = source === 'local' || messages.length >= DEFAULT_MESSAGE_PAGE_SIZE;
    historyRequestRef.current.hasMoreOlder = hasMoreOlder;
    setHistoryState((state) => ({
      ...state,
      isLoadingOlder: false,
      hasMoreOlder,
    }));

    return messages.length > 0;
  }, [addMsgList, selectedConversation?.id]);

  useEffect(() => {
    if (userInfo?.id) {
      fetchLocalConversationData();
      fetchConversationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  // TODO: 监听页面可见性
  // useEffect(() => {
  //   if (!userInfo?.id) return;
  //   const onVisibilityChange = () => {
  //     if (document.visibilityState === 'visible') {
  //       fetchConversationData();
  //     }
  //   };
  //   document.addEventListener('visibilitychange', onVisibilityChange);
  //   const timer = window.setInterval(() => {
  //     if (document.visibilityState === 'visible') {
  //       fetchConversationData();
  //     }
  //   }, 30000);
  //   return () => {
  //     document.removeEventListener('visibilitychange', onVisibilityChange);
  //     window.clearInterval(timer);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [userInfo?.id]);

  useEffect(() => {
    if (selectedConversation) {
      const shouldReload =
        useMessageStore.getState().dataConversationId !== selectedConversation.id;
      if (shouldReload) {
        clear();
        setDataConversationId(selectedConversation.id);
        remoteBeforeMsgIdRef.current = null;
        historyRequestRef.current = {
          isLoadingOlder: false,
          hasMoreOlder: false,
        };
        setHistoryState({
          isLoadingLatest: false,
          isLoadingOlder: false,
          hasMoreOlder: false,
        });
      }
      fetchLocalMessageHistory(selectedConversation.id);
      fetchLatestMessageHistory(selectedConversation.id);
      if ((selectedConversation.unreadCount ?? 0) > 0) {
        markConversationAsRead(selectedConversation.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  return {
    conversationData,
    fetchConversationData,
    loadOlderMessages,
    historyState,
  };
};
