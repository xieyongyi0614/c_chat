'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  ChatMessageBubble,
  ChatMessageMeta,
  ChatMessageRow,
  ChatMessageSenderName,
  ChatMessageStack,
  Spinner,
  cn,
} from '@c_chat/ui';
import { formatChatTime } from '@c_chat/shared-utils';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import { MessageStatus, type LocalMessageListItem } from '@c_chat/shared-types';
import { useUserStore } from '@/lib/stores/user.store';
import { messageService, uploadManager } from '@/lib/services';
import { MessageContent } from './MessageContent';

interface MessageItemProps {
  message: LocalMessageListItem;
  isGroup: boolean;
  showSender: boolean;
}

const initialOf = (value?: string): string => value?.trim().charAt(0).toUpperCase() || '?';

export function MessageItem({ message, isGroup, showSender }: MessageItemProps) {
  const userId = useUserStore((state) => state.userInfo?.id);
  const [resending, setResending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMe = message.senderId === userId;
  const senderName = message.senderNickname || message.senderEmail || message.senderId;
  // 媒体 pending：未拿到服务端 fileId/seq，重试需要用户重新选择同一文件
  const isMediaPending = message.type !== MESSAGE_TYPE.Text && !message.fileId;

  const handleResend = async () => {
    if (resending) return;
    if (isMediaPending) {
      fileInputRef.current?.click();
      return;
    }
    setResending(true);
    try {
      await messageService.resendMessage(message.clientMsgId);
    } catch (error) {
      console.error('Failed to resend message:', error);
    } finally {
      setResending(false);
    }
  };

  const handleRepick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setResending(true);
    try {
      await uploadManager.retry(message.clientMsgId, file);
    } catch (error) {
      console.error('Failed to retry upload:', error);
    } finally {
      setResending(false);
    }
  };

  const showAvatar = isGroup && !isMe;
  const isMedia = message.type === MESSAGE_TYPE.Image || message.type === MESSAGE_TYPE.Video;

  return (
    <ChatMessageRow isMe={isMe}>
      {showAvatar && (
        <Avatar className="size-8 shrink-0">
          {showSender ? <AvatarImage src={message.senderAvatar} alt={senderName} /> : null}
          <AvatarFallback className={cn('text-xs', !showSender && 'invisible')}>
            {initialOf(senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      <ChatMessageStack isMe={isMe}>
        {showAvatar && showSender && <ChatMessageSenderName>{senderName}</ChatMessageSenderName>}
        <ChatMessageBubble isMe={isMe} isMedia={isMedia}>
          <MessageContent message={message} isMe={isMe} />
        </ChatMessageBubble>
        <ChatMessageMeta>
          <span>{formatChatTime(message.createTime)}</span>
          {isMe && (resending || message.status === MessageStatus.sending) && (
            <Spinner className="size-3" />
          )}
          {isMe && message.status === MessageStatus.uploading && (
            <span className="flex items-center gap-1">
              <Spinner className="size-3" />
              <span>{message.progress ?? 0}%</span>
            </span>
          )}
          {isMe && message.status === MessageStatus.success && <Check className="size-3" />}
          {isMe && message.status === MessageStatus.fail && !resending && (
            <button
              type="button"
              className="text-destructive"
              aria-label={isMediaPending ? '重新选择文件上传' : '重发'}
              onClick={() => {
                void handleResend();
              }}
            >
              <AlertCircle className="size-3" />
            </button>
          )}
          {isMe && isMediaPending && (
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(event) => {
                void handleRepick(event);
              }}
            />
          )}
        </ChatMessageMeta>
      </ChatMessageStack>
    </ChatMessageRow>
  );
}
