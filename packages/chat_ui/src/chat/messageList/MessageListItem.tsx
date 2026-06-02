import { memo, useMemo, useState, type ReactNode } from 'react';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import { MessageStatus } from '@c_chat/shared-types';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components';
import {
  ChatMessageAvatar,
  ChatMessageBubble,
  ChatMessageContent,
  ChatMessageRow,
  ChatMessageSenderName,
  ChatMessageStack,
  MessageDate,
  type ChatMessageAudioControls,
  type ChatMessageFileResolver,
} from '../chatMessage';
import type {
  ChatMessageAudioControlsSlotProps,
  ChatMessageListItem,
  ChatMessageListLabels,
  ChatMessageOpenPreviewPayload,
  ChatMessageSenderProfile,
} from './types';

interface MessageListItemProps<TMessage extends ChatMessageListItem> {
  messages: TMessage[];
  currentUser?: ChatMessageSenderProfile | null;
  isRead: boolean;
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, ChatMessageSenderProfile>;
  fileResolver: ChatMessageFileResolver;
  labels?: ChatMessageListLabels;
  AudioControlsSlot?: (props: ChatMessageAudioControlsSlotProps<TMessage>) => ReactNode;
  onRetryMessages?: (payload: { messages: TMessage[] }) => void | Promise<void>;
  onOpenPreview?: (payload: ChatMessageOpenPreviewPayload<TMessage>) => void;
}

const getInitials = (value?: string | null) => {
  const text = value?.trim();
  if (!text) return '?';
  return text.slice(0, 2).toUpperCase();
};

function MessageListItemComponent<TMessage extends ChatMessageListItem>({
  messages,
  currentUser,
  isRead,
  isGroupConversation,
  senderProfiles,
  fileResolver,
  labels,
  AudioControlsSlot,
  onRetryMessages,
  onOpenPreview,
}: MessageListItemProps<TMessage>) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const message = messages[0];
  const isMe = message.senderId === currentUser?.id;

  const sender = useMemo<ChatMessageSenderProfile>(() => {
    if (isMe) {
      return {
        id: currentUser?.id ?? message.senderId,
        nickname: currentUser?.nickname ?? currentUser?.email ?? message.senderNickname,
        avatarUrl: currentUser?.avatarUrl ?? message.senderAvatar,
        email: currentUser?.email ?? message.senderEmail,
      };
    }

    const profile = senderProfiles?.[message.senderId];
    return {
      id: message.senderId,
      nickname:
        message.senderNickname ||
        profile?.nickname ||
        message.senderEmail ||
        labels?.unknownSender ||
        'Unknown member',
      avatarUrl: message.senderAvatar || profile?.avatarUrl || '',
      email: message.senderEmail || profile?.email || '',
    };
  }, [
    currentUser,
    isMe,
    labels?.unknownSender,
    message.senderAvatar,
    message.senderEmail,
    message.senderId,
    message.senderNickname,
    senderProfiles,
  ]);

  const senderName = sender.nickname || sender.email || sender.id;
  const showSender = Boolean(isGroupConversation);
  const isVideoMessage = message.type === MESSAGE_TYPE.Video;
  const failedOwnMessages = isMe
    ? messages.filter((item) => item.status === MessageStatus.fail && item.clientMsgId)
    : [];

  const handleRetry = async () => {
    if (failedOwnMessages.length === 0 || retrying || !onRetryMessages) return;

    setRetrying(true);
    try {
      await onRetryMessages({ messages: failedOwnMessages });
    } finally {
      setRetrying(false);
    }
  };

  const openMediaPreview = (initialIndex: number) => {
    const clickedMessage = messages[initialIndex];
    if (!clickedMessage) return;

    onOpenPreview?.({
      message: clickedMessage,
      groupMessages: messages,
      initialIndex,
    });
  };

  const renderMessageContent = (audioControls?: ChatMessageAudioControls) => (
    <>
      <ChatMessageContent
        messages={messages}
        isMe={isMe}
        isRead={isRead}
        onRetry={handleRetry}
        retrying={retrying}
        fileResolver={fileResolver}
        audioControls={audioControls}
        onOpenPreview={openMediaPreview}
      />
      {message.type === MESSAGE_TYPE.Text && (
        <MessageDate
          time={message.createTime}
          status={message.status}
          isMe={isMe}
          isRead={isRead}
          onRetry={handleRetry}
          retrying={retrying}
          className="relative top-1.5"
        />
      )}
    </>
  );

  return (
    <ChatMessageRow isMe={isMe}>
      {showSender && !isMe && (
        <ChatMessageAvatar
          avatarUrl={fileResolver.formatFileUrl(sender.avatarUrl ?? '')}
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
          isMedia={message.type === MESSAGE_TYPE.Image}
          isVideo={isVideoMessage}
        >
          {AudioControlsSlot ? (
            <AudioControlsSlot message={message} isMe={isMe}>
              {renderMessageContent}
            </AudioControlsSlot>
          ) : (
            renderMessageContent()
          )}
        </ChatMessageBubble>
      </ChatMessageStack>

      {showSender && isMe && (
        <ChatMessageAvatar
          avatarUrl={fileResolver.formatFileUrl(sender.avatarUrl ?? '')}
          senderName={senderName}
          fallback={getInitials(senderName)}
          onClick={() => setProfileOpen(true)}
        />
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{labels?.profileTitle ?? 'Account information'}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage
                src={fileResolver.formatFileUrl(sender.avatarUrl ?? '')}
                alt={senderName}
              />
              <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold">{senderName}</span>
                {isMe && <Badge variant="secondary">{labels?.ownBadge ?? 'Me'}</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{sender.email || sender.id}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ChatMessageRow>
  );
}

export const MessageListItem = memo(MessageListItemComponent) as typeof MessageListItemComponent;
