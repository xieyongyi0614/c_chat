import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildChatMediaPreviewItems,
  MessageList,
  type ChatMessageFileResolver,
  type ChatMessageListProps,
  type ChatMessageOpenPreviewPayload,
  type ChatMessageRetryPayload,
  type ChatMessageSenderProfile,
} from '@c_chat/ui';
import { useChatStore, useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import { ConversationType, MessageStatus, type LocalMessageListItem } from '@c_chat/shared-types';
import { bufferToPreviewUrl, ipc, to } from '@c_chat/shared-utils';
import { useShallow } from 'zustand/react/shallow';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import { audioPlayerManager } from '@c_chat/audio-core';
import { useAudioMessage } from '@c_chat/frontend/hooks/useAudioMessage';
import useWaveformCanvas from '@c_chat/frontend/hooks/useWaveformCanvas';
import { toast } from 'sonner';

interface MessageHistoryListProps {
  loadOlderMessages: () => Promise<boolean>;
  historyState: {
    isLoadingLatest: boolean;
    isLoadingOlder: boolean;
    hasMoreOlder: boolean;
  };
}

const fileResolver: ChatMessageFileResolver = {
  formatFileUrl,
  loadLocalPreview: async (message) => {
    if (!message.filePath) return '';
    const buffer = await ipc.ReadLocalFile({ path: message.filePath });
    return bufferToPreviewUrl({ buffer, type: message.mimeType || 'image/*' });
  },
};

const messageListLabels = {
  profileTitle: '账号信息',
  ownBadge: '我',
  unknownSender: '未知成员',
};

const AudioControlsSlot: ChatMessageListProps<LocalMessageListItem>['AudioControlsSlot'] = ({
  message,
  isMe,
  children,
}) => {
  const audioPlayback = useAudioMessage(message.clientMsgId);
  const waveformCanvasRef = useWaveformCanvas(
    {
      waveform: message.waveform ?? '',
      duration: message.duration ?? 0,
    },
    audioPlayback.currentTime / audioPlayback.duration,
    isMe,
  );

  return children({
    playback: audioPlayback,
    waveformCanvasRef,
    onTogglePlay: async () => {
      const audioUrl = formatFileUrl(message.fileUrl ?? '');
      if (!audioUrl) return;

      if (audioPlayback.playing) {
        audioPlayerManager.pause();
        return;
      }

      await audioPlayerManager.play(message.clientMsgId, audioUrl);
    },
  });
};

const MessageHistoryList = ({ historyState, loadOlderMessages }: MessageHistoryListProps) => {
  const dateKeys = useMessageStore(useShallow((s) => Array.from(s.groups.keys()).reverse()));
  const dataConversationId = useMessageStore((s) => s.dataConversationId);
  const groups = useMessageStore((s) => s.groups);
  const msgMap = useMessageStore((s) => s.msgMap);
  const updateMsgs = useMessageStore((s) => s.updateMsgs);
  const userInfo = useUserStore((s) => s.userInfo);
  const selectedConversation = useChatStore((s) => s.selectedConversation);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, ChatMessageSenderProfile>>(
    {},
  );
  const isGroupConversation = selectedConversation?.type === ConversationType.Group;
  const currentUser = useMemo<ChatMessageSenderProfile | null>(() => {
    if (!userInfo) return null;

    return {
      id: userInfo.id,
      nickname: userInfo.nickname ?? undefined,
      avatarUrl: userInfo.avatarUrl ?? undefined,
      email: userInfo.email ?? undefined,
    };
  }, [userInfo]);

  useEffect(() => {
    if (!isGroupConversation || !selectedConversation?.targetId) {
      setSenderProfiles({});
      return;
    }

    let disposed = false;
    const loadGroupMembers = async () => {
      const [err, res] = await to(ipc.GetGroupDetail({ groupId: selectedConversation.targetId }));
      if (disposed || err) return;

      const profiles =
        res.members?.reduce<Record<string, ChatMessageSenderProfile>>((acc, member) => {
          if (member.userId) {
            acc[member.userId] = {
              id: member.userId,
              nickname: member.nickname || member.alias || member.userId,
              avatarUrl: member.avatarUrl ?? '',
            };
          }
          return acc;
        }, {}) ?? {};
      setSenderProfiles(profiles);
    };

    loadGroupMembers();
    return () => {
      disposed = true;
    };
  }, [isGroupConversation, selectedConversation?.targetId]);

  const handleRetryMessages: ChatMessageListProps<LocalMessageListItem>['onRetryMessages'] =
    useCallback(
      async ({ messages }: ChatMessageRetryPayload<LocalMessageListItem>) => {
        updateMsgs(
          messages.map((message: LocalMessageListItem) => ({
            ...message,
            status: MessageStatus.sending,
            updateTime: Date.now(),
          })),
        );

        const nextMessages: LocalMessageListItem[] = [];

        for (const message of messages) {
          const [err, res] = await to(ipc.ResendMessage({ clientMsgId: message.clientMsgId }));
          if (err) {
            console.error('Failed to resend message:', err);
            updateMsgs(
              messages.map((failedMessage: LocalMessageListItem) => ({
                ...failedMessage,
                status: MessageStatus.fail,
                updateTime: Date.now(),
              })),
            );
            toast.error('重发失败');
            return;
          }
          nextMessages.push(...res);
        }

        updateMsgs(nextMessages);
      },
      [updateMsgs],
    );

  const handleOpenPreview: ChatMessageListProps<LocalMessageListItem>['onOpenPreview'] =
    useCallback(({ message }: ChatMessageOpenPreviewPayload<LocalMessageListItem>) => {
      const previewItems = buildChatMediaPreviewItems(
        useMessageStore.getState().msgMap,
        message.conversationId,
      );
      const fallbackItem = buildChatMediaPreviewItems({ [message.id]: [message] })[0];
      const items = previewItems.length ? previewItems : fallbackItem ? [fallbackItem] : [];
      const initialIndex = Math.max(
        0,
        items.findIndex((item) => item.id === message.id),
      );

      void ipc.OpenMediaPreview({
        items,
        initialIndex,
        conversationId: message.conversationId,
        messageId: message.id,
      });
    }, []);

  return (
    <MessageList
      conversationKey={dataConversationId}
      dateKeys={dateKeys}
      groups={groups}
      msgMap={msgMap}
      currentUser={currentUser}
      isGroupConversation={isGroupConversation}
      senderProfiles={senderProfiles}
      historyState={historyState}
      loadOlderMessages={loadOlderMessages}
      fileResolver={fileResolver}
      AudioControlsSlot={AudioControlsSlot}
      onRetryMessages={handleRetryMessages}
      onOpenPreview={handleOpenPreview}
      labels={messageListLabels}
    />
  );
};

export default memo(MessageHistoryList);
