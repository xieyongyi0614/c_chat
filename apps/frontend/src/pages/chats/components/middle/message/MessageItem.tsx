import { memo, useMemo, useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  ChatMessageAvatar,
  ChatMessageBubble,
  ChatMessageContent,
  type ChatMessageFileResolver,
  ChatMessageRow,
  ChatMessageSenderName,
  ChatMessageStack,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  MessageDate,
} from '@c_chat/ui';
import { useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import { bufferToPreviewUrl, ipc, to } from '@c_chat/shared-utils';
import { toast } from 'sonner';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import { MessageStatus, type LocalMessageListItem } from '@c_chat/shared-types';
import type { SenderProfile } from './senderProfile';
import { audioPlayerManager } from '@c_chat/audio-core';
import { useAudioMessage } from '@c_chat/frontend/hooks/useAudioMessage';
import useWaveformCanvas from '@c_chat/frontend/hooks/useWaveformCanvas';
import { buildConversationPreviewItems, toMediaPreviewItem } from './mediaPreviewItems';
import { useShallow } from 'zustand/react/shallow';

interface MessageItemProps {
  isRead: boolean;
  groupId: string;
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, SenderProfile>;
}

const getInitials = (value?: string | null) => {
  const text = value?.trim();
  if (!text) return '?';
  return text.slice(0, 2).toUpperCase();
};

const fileResolver: ChatMessageFileResolver = {
  formatFileUrl,
  loadLocalPreview: async (message) => {
    if (!message.filePath) return '';
    const buffer = await ipc.ReadLocalFile({ path: message.filePath });
    return bufferToPreviewUrl({ buffer, type: message.mimeType || 'image/*' });
  },
};

const EMPTY_MESSAGES: LocalMessageListItem[] = [];

const MessageItem = ({
  isRead,
  groupId,
  isGroupConversation,
  senderProfiles,
}: MessageItemProps) => {
  console.log('message item render');
  const userInfo = useUserStore((s) => s.userInfo);
  const userId = userInfo?.id;
  const messages = useMessageStore(useShallow((s) => s.msgMap[groupId] ?? EMPTY_MESSAGES));
  const updateMsgs = useMessageStore((s) => s.updateMsgs);
  const [profileOpen, setProfileOpen] = useState(false);
  const [resending, setResending] = useState(false);

  const msg = messages[0];
  const audioPlayback = useAudioMessage(msg.clientMsgId);
  const isMe = msg.senderId === userId;
  const waveformCanvasRef = useWaveformCanvas(
    {
      waveform: msg.waveform ?? '',
      duration: msg.duration ?? 0,
    },
    audioPlayback.currentTime / audioPlayback.duration,
    isMe,
  );
  const sender = useMemo<SenderProfile>(() => {
    if (isMe) {
      return {
        id: userInfo?.id ?? msg.senderId,
        nickname: userInfo?.nickname ?? userInfo?.email ?? msg.senderNickname,
        avatarUrl: userInfo?.avatarUrl ?? msg.senderAvatar,
        email: userInfo?.email ?? msg.senderEmail,
      };
    }

    const profile = senderProfiles?.[msg.senderId];
    return {
      id: msg.senderId,
      nickname: msg.senderNickname || profile?.nickname || msg.senderEmail || '未知成员',
      avatarUrl: msg.senderAvatar || profile?.avatarUrl || '',
      email: msg.senderEmail || profile?.email || '',
    };
  }, [
    isMe,
    msg.senderAvatar,
    msg.senderEmail,
    msg.senderId,
    msg.senderNickname,
    senderProfiles,
    userInfo,
  ]);
  const senderName = sender.nickname || sender.email || sender.id;
  const showSender = Boolean(isGroupConversation);
  const isVideoMessage = msg.type === MESSAGE_TYPE.Video;
  const failedOwnMessages = isMe
    ? messages.filter((item) => item.status === MessageStatus.fail && item.clientMsgId)
    : [];

  const openMediaPreview = (initialIndex: number) => {
    const clickedMessage = messages[initialIndex];
    const previewItems = buildConversationPreviewItems(
      useMessageStore.getState().msgMap,
      clickedMessage?.conversationId,
    );
    const fallbackItem = clickedMessage ? toMediaPreviewItem(clickedMessage) : null;
    const items = previewItems.length ? previewItems : fallbackItem ? [fallbackItem] : [];
    const resolvedInitialIndex = Math.max(
      0,
      items.findIndex((item) => item.id === clickedMessage?.id),
    );

    void ipc.OpenMediaPreview({
      items,
      initialIndex: resolvedInitialIndex,
      conversationId: clickedMessage?.conversationId ?? messages[0]?.conversationId,
      messageId: clickedMessage?.id,
    });
  };

  const toggleAudioPlay = async () => {
    const audioUrl = formatFileUrl(msg.fileUrl ?? '');
    if (!audioUrl) return;
    if (audioPlayback.playing) {
      audioPlayerManager.pause();
    } else {
      await audioPlayerManager.play(msg.clientMsgId, audioUrl);
    }
  };

  const handleResend = async () => {
    if (failedOwnMessages.length === 0 || resending) return;

    setResending(true);
    updateMsgs(
      failedOwnMessages.map((item) => ({
        ...item,
        status: MessageStatus.sending,
        updateTime: Date.now(),
      })),
    );

    const nextMessages = [];

    for (const item of failedOwnMessages) {
      const [err, res] = await to(ipc.ResendMessage({ clientMsgId: item.clientMsgId }));
      if (err) {
        console.error('Failed to resend message:', err);
        updateMsgs(
          failedOwnMessages.map((failedItem) => ({
            ...failedItem,
            status: MessageStatus.fail,
            updateTime: Date.now(),
          })),
        );
        toast.error('重发失败');
        setResending(false);
        return;
      }
      nextMessages.push(...res);
    }

    updateMsgs(nextMessages);
    setResending(false);
  };

  return (
    <ChatMessageRow isMe={isMe}>
      {showSender && !isMe && (
        <ChatMessageAvatar
          avatarUrl={formatFileUrl(sender.avatarUrl ?? '')}
          senderName={senderName}
          fallback={getInitials(senderName)}
          onClick={() => setProfileOpen(true)}
        />
      )}

      <ChatMessageStack isMe={isMe}>
        {showSender && !isMe && (
          <ChatMessageSenderName
            className="mb-1 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setProfileOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                setProfileOpen(true);
              }
            }}
          >
            {senderName}
          </ChatMessageSenderName>
        )}
        <ChatMessageBubble
          isMe={isMe}
          isMedia={msg.type === MESSAGE_TYPE.Image}
          isVideo={isVideoMessage}
        >
          <ChatMessageContent
            messages={messages}
            isMe={isMe}
            isRead={isRead}
            onRetry={handleResend}
            retrying={resending}
            fileResolver={fileResolver}
            audioControls={{
              playback: audioPlayback,
              waveformCanvasRef,
              onTogglePlay: toggleAudioPlay,
            }}
            onOpenPreview={openMediaPreview}
          />
          {msg.type === MESSAGE_TYPE.Text && (
            <MessageDate
              time={msg.createTime}
              status={msg.status}
              isMe={isMe}
              isRead={isRead}
              onRetry={handleResend}
              retrying={resending}
              className="relative top-1.5"
            />
          )}
        </ChatMessageBubble>
      </ChatMessageStack>

      {showSender && isMe && (
        <ChatMessageAvatar
          avatarUrl={formatFileUrl(sender.avatarUrl ?? '')}
          senderName={senderName}
          fallback={getInitials(senderName)}
          onClick={() => setProfileOpen(true)}
        />
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>账号信息</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage src={formatFileUrl(sender.avatarUrl ?? '')} alt={senderName} />
              <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold">{senderName}</span>
                {isMe && <Badge variant="secondary">我</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{sender.email || sender.id}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ChatMessageRow>
  );
};

export default memo(MessageItem);
