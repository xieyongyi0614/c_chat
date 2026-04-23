import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type {
  GetConversationListParams,
  GetLocalConversationListParams,
} from '@c_chat/shared-types';
import { ipc, to, transformListParams } from '@c_chat/shared-utils';
import { useEffect } from 'react';
import { toast } from 'sonner';

export const useChatsData = () => {
  const { userInfo } = useUserStore();
  const {
    conversationData,
    setConversationData,
    selectedConversation,
    setMessageData,
    markConversationAsRead,
  } = useChatStore();

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
      return;
    }
    console.log('fetchLocalMessageHistory', res);
    setMessageData(res);
  };

  const fetchMessageHistory = async (conversationId: string) => {
    const [err, res] = await to(
      ipc.GetMessageHistory({
        conversationId,
        pagination: { page: 1, pageSize: 50 },
      }),
    );
    console.log('fetchMessageHistory', res, err);
    if (res) {
      setMessageData(res);
    }
  };

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
      fetchLocalMessageHistory(selectedConversation.id);
      fetchMessageHistory(selectedConversation.id);
      if ((selectedConversation.unreadCount ?? 0) > 0) {
        markConversationAsRead(selectedConversation.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  return {
    conversationData,
    fetchConversationData,
  };
};
