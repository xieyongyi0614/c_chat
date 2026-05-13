import { useEffect } from 'react';
import { useChatStore, useMessageStore, useUserStore } from '../stores';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { toast } from 'sonner';
import type { WebContentEvents, WebContentEventType } from '@c_chat/shared-types';
import { useLastCallback } from './useLastCallback';
import { generateLastMsgContent } from '../utils/lastMsgContentUtil';

/** 全局订阅监听 */
export const useGlobalSubscribe = () => {
  const { userInfo, isSignedIn } = useUserStore();
  const { updateConversationSnapshot } = useChatStore();
  const { updateMsg, addMsgList } = useMessageStore();
  const selectedConversationId = useChatStore((s) => s.selectedConversation?.id);

  const newMessageHandle = useLastCallback<WebContentEvents['newMessage']>((data) => {
    console.log('收到新消息:', data);
    if (data) {
      const isOwnMessage = data.senderId === userInfo?.id;
      const isCurrentConversation = selectedConversationId === data.conversationId;

      if (isOwnMessage) {
        console.log('收到自己发送的消息推送，更新数据');
        if (isCurrentConversation) updateMsg(data);
      } else {
        if (isCurrentConversation) addMsgList([data]);
      }

      updateConversationSnapshot(
        data.conversationId,
        generateLastMsgContent(data.type, data.content),
        data.createTime,
      );
    }
  });

  const uploadProgressHandle = useLastCallback<WebContentEvents['uploadProgress']>((data) => {
    if (data?.clientMsgId) {
      // updateMsg({ clientMsgId: data.clientMsgId, progress: data.progress } as LocalMessageListItem);
      console.log('上传进度:', data);
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
        // 监听上传进度
        window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.uploadProgress, uploadProgressHandle),
      ];
      return subscribeAll(unSubscriptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  return {};
};
