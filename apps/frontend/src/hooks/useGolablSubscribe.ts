import { useCallback, useEffect, useRef } from 'react';
import { useChatStore, useUserStore } from '../stores';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { toast } from 'sonner';
import type {
  LocalMessageListItem,
  WebContentEvents,
  WebContentEventType,
} from '@c_chat/shared-types';
import { useLastCallback } from './useLastCallback';

/** 全局订阅监听 */
export const useGlobalSubscribe = () => {
  const { userInfo, isSignedIn } = useUserStore();
  const {
    selectedConversation,
    addMessage,
    updateConversationSnapshot,
    markActiveConversationRead,
  } = useChatStore();
  const latestReadMessageIdRef = useRef<Record<string, string>>({});

  const scheduleReadReceipt = useCallback((conversationId: string, messageId: string) => {
    latestReadMessageIdRef.current[conversationId] = messageId;
    // const existingTimer = readTimersRef.current[conversationId];
    // if (existingTimer) {
    //   window.clearTimeout(existingTimer);
    // }
    // readTimersRef.current[conversationId] = window.setTimeout(() => {
    //   const latestMessageId = latestReadMessageIdRef.current[conversationId];
    //   ipc
    //     .ReadMessage({ conversationId, messageId: latestMessageId })
    //     .catch((error) => console.error('auto read message failed:', error))
    //     .finally(() => {
    //       delete readTimersRef.current[conversationId];
    //     });
    // }, 400);
  }, []);
  const socketMessageHandle = useLastCallback<WebContentEvents['socketMessage']>((data) => {
    console.log('收到新消息:', data);
    if (data) {
      const message: LocalMessageListItem = {
        ...data,
        state: 0,
        createTime: Number(data.createTime),
        updateTime: Number(data.updateTime),
      };

      const isOwnMessage = data.senderId === userInfo?.id;

      if (isOwnMessage) {
        console.log('收到自己发送的消息推送，忽略重复添加');
      } else {
        const isActiveConversation = selectedConversation?.id === data.conversationId;
        addMessage(message);
        // 当前正在查看会话时，立即回执已读并保持未读数为0；否则走未读+1
        if (isActiveConversation) {
          updateConversationSnapshot(data.conversationId, data.content, Number(data.createTime));
          markActiveConversationRead(data.conversationId, data.msgId);
          scheduleReadReceipt(data.conversationId, data.id);
        } else {
          // 更新会话列表的快照和未读数
          updateConversationSnapshot(data.conversationId, data.content, Number(data.createTime));
        }
      }
    }
  });
  const subscribeAll = (subscriptions: ReturnType<WebContentEventType['on']>[]) => {
    return () => subscriptions.forEach((unSub) => unSub());
  };

  useEffect(() => {
    window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.Toast, (type, message) => {
      console.log(type, message, 'Toast data');
      const toastFn = toast[type];
      if (typeof toastFn === 'function') {
        toastFn(message);
      } else {
        console.warn(`未知type: ${type}, 使用默认`);
        toast(message);
      }
    });
  }, []);

  useEffect(() => {
    if (isSignedIn()) {
      const unSubscriptions = [
        // 监听实时消息推送
        window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketMessage, socketMessageHandle),
      ];
      return subscribeAll(unSubscriptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  return {};
};
