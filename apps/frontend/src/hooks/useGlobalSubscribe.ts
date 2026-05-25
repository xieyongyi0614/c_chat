import { useEffect } from 'react';
import { useChatStore, useMessageStore, useUserStore } from '../stores';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { toast } from 'sonner';
import {
  MessageStatus,
  type LocalMessageListItem,
  type WebContentEvents,
  type WebContentEventType,
} from '@c_chat/shared-types';
import { useLastCallback } from './useLastCallback';

export const useGlobalSubscribe = () => {
  const { userInfo, isSignedIn } = useUserStore();
  const { upsertAndPinConversation, removeConversation } = useChatStore();
  const { updateMsg, updateMsgs, addMsgList } = useMessageStore();
  const dataConversationId = useMessageStore((s) => s.dataConversationId);
  const hasSelectedDraft = useChatStore((s) => Boolean(s.selectedUserForDraft));

  const newUpdateMessageHandle = useLastCallback<WebContentEvents['newUpdateMessage']>((data) => {
    console.log('收到 updates', data);
    const { messages, conversations, removedConversationIds } = data;

    if (removedConversationIds?.length) {
      removedConversationIds.forEach((conversationId) => removeConversation(conversationId));
    }

    if (messages?.length) {
      const ownUpdates: LocalMessageListItem[] = [];
      const incomingAdds: LocalMessageListItem[] = [];

      for (const msg of messages) {
        const isOwnMessage = msg.senderId === userInfo?.id;
        const isCurrentConversation =
          msg.conversationId === dataConversationId || (isOwnMessage && hasSelectedDraft);

        if (!isCurrentConversation) continue;

        if (isOwnMessage) {
          ownUpdates.push(msg);
        } else {
          incomingAdds.push(msg);
        }
      }

      if (ownUpdates.length > 0) {
        updateMsgs(ownUpdates);
      }
      if (incomingAdds.length > 0) {
        addMsgList(incomingAdds);
      }
    }

    if (conversations?.length) {
      conversations.forEach((conversation) => {
        upsertAndPinConversation(conversation);
      });
    }
  });

  const uploadProgressHandle = useLastCallback<WebContentEvents['uploadProgress']>((data) => {
    if (!data?.clientMsgId) return;

    console.log('上传进度:', data);
    const existingMsg = Object.values(useMessageStore.getState().msgMap)
      .flat()
      .find((msg) => msg.clientMsgId === data.clientMsgId);

    if (existingMsg) {
      updateMsg({
        ...existingMsg,
        status: MessageStatus.uploading,
        progress: data.progress,
        updateTime: Date.now(),
      });
    }
  });

  const subscribeAll = (subscriptions: ReturnType<WebContentEventType['on']>[]) => () =>
    subscriptions.forEach((unSub) => unSub());

  useEffect(() => {
    window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.Toast, (type, message) => {
      console.log(type, message, 'Toast data');
      const toastFn = toast[type];
      if (typeof toastFn === 'function') {
        toastFn(message);
      } else {
        console.warn(`未知 type: ${type}, 使用默认 toast`);
        toast(message);
      }
    });
  }, []);

  useEffect(() => {
    if (isSignedIn()) {
      const unSubscriptions = [
        window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.newUpdateMessage, newUpdateMessageHandle),
        window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.uploadProgress, uploadProgressHandle),
      ];
      return subscribeAll(unSubscriptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  return {};
};
