import { memo, useMemo, useState, type ReactNode } from 'react';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import { MessageStatus } from '@c_chat/shared-types';
import { ChatUserInfoDialog } from '../profileDialog';
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
  ChatAvatarPreviewPayload,
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
  onAvatarPreview?: (payload: ChatAvatarPreviewPayload) => void;
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
  onAvatarPreview,
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
  const showGroupPeer = showSender && !isMe;
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

  const handleAvatarPreview = (avatarUrl: string) => {
    onAvatarPreview?.({
      id: sender.id,
      name: senderName,
      avatarUrl,
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

  const anchorId = message.clientMsgId || message.id;

  return (
    <ChatMessageRow
      data-message-anchor={anchorId}
      isMe={isMe}
      className={showGroupPeer ? 'items-center' : undefined}
    >
      {showSender && !isMe && (
        <ChatMessageAvatar
          id={sender.id}
          avatarUrl={fileResolver.formatFileUrl(sender.avatarUrl ?? '')}
          senderName={senderName}
          fallback={getInitials(senderName)}
          className="hover:bg-transparent"
          onClick={() => setProfileOpen(true)}
        />
      )}

      <ChatMessageStack isMe={isMe}>
        {showGroupPeer && message.type !== MESSAGE_TYPE.Text ? (
          <ChatMessageSenderName
            className="mb-1 cursor-pointer text-violet-600"
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
        ) : null}
        <ChatMessageBubble
          isMe={isMe}
          isMedia={message.type === MESSAGE_TYPE.Image}
          isVideo={isVideoMessage}
          className={
            showGroupPeer && message.type === MESSAGE_TYPE.Text
              ? 'rounded-2xl rounded-bl-sm px-3 py-1.5'
              : undefined
          }
        >
          {showGroupPeer && message.type === MESSAGE_TYPE.Text ? (
            <ChatMessageSenderName
              className="mb-0.5 block cursor-pointer text-sm font-medium leading-tight text-violet-600"
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
          ) : null}
          {AudioControlsSlot ? (
            <AudioControlsSlot message={message} isMe={isMe}>
              {renderMessageContent}
            </AudioControlsSlot>
          ) : (
            renderMessageContent()
          )}
        </ChatMessageBubble>
      </ChatMessageStack>

      <ChatUserInfoDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={{
          id: sender.id,
          name: senderName,
          avatarUrl: fileResolver.formatFileUrl(sender.avatarUrl ?? ''),
          email: sender.email,
          fallback: getInitials(senderName),
        }}
        isCurrentUser={isMe}
        labels={{
          title: labels?.profileTitle,
          ownBadge: labels?.ownBadge,
        }}
        onAvatarPreview={handleAvatarPreview}
      />
    </ChatMessageRow>
  );
}

export const MessageListItem = memo(MessageListItemComponent) as typeof MessageListItemComponent;
