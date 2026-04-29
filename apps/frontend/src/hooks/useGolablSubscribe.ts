import { useEffect } from 'react';
import { useChatStore, useMessageStore, useUserStore } from '../stores';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { toast } from 'sonner';
import type { WebContentEvents, WebContentEventType } from '@c_chat/shared-types';
import { useLastCallback } from './useLastCallback';

/** 全局订阅监听 */
export const useGlobalSubscribe = () => {
  const { userInfo, isSignedIn } = useUserStore();
  const { addMessage, setMessageData, updateConversationSnapshot } = useChatStore();
  const { updateMsg, addMsg } = useMessageStore();

  const newMessageHandle = useLastCallback<WebContentEvents['newMessage']>((data) => {
    console.log('收到新消息:', data);
    if (data) {
      const isOwnMessage = data.senderId === userInfo?.id;

      if (isOwnMessage) {
        console.log('收到自己发送的消息推送，更新数据');
        updateMsg(data);
        // setMessageData((state) => {
        //   const index = state.list.findIndex((m) => m.id === data.id);
        //   if (index === -1) return state;
        //   const newList = [...state.list];
        //   newList[index] = data;
        //   console.log('收到自己发送的消息推送，更新数据111', JSON.stringify(newList[index]));
        //   return {
        //     ...state,
        //     list: newList,
        //   };
        // });
        updateConversationSnapshot(data.conversationId, data.content, data.createTime);
        return;
      }
      addMsg(data);
      updateConversationSnapshot(data.conversationId, data.content, data.createTime);
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
        window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.newMessage, newMessageHandle),
      ];
      return subscribeAll(unSubscriptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  return {};
};
