import { useChatStore, useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import { DEFAULT_MESSAGE_PAGE_SIZE } from '@c_chat/shared-config';
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
    // setMessageData,
    markConversationAsRead,
  } = useChatStore();
  const { addMsgList } = useMessageStore();

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
    // debugger;
    // const returnData = res.map((r) => snakeToCamelCase(r));

    addMsgList(res);
  };

  const fetchMessageHistory = async (conversationId: string) => {
    const [err, res] = await to(
      ipc.GetMessageHistory({ conversationId, pageSize: DEFAULT_MESSAGE_PAGE_SIZE }),
    );
    if (res) {
      // setMessageData(res);
      // addMsgList(res.list);
      console.log('fetchMessageHistory', res.list.length);
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
