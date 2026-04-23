import { useEffect } from 'react';
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
  const { addMessage, updateConversationSnapshot } = useChatStore();

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
        return;
      }
      addMessage(message);
      updateConversationSnapshot(data.conversationId, data.content, Number(data.createTime));
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
