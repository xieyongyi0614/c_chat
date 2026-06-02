import { memo } from 'react';
import { formatChatTime } from '@c_chat/shared-utils';
import { cn } from '../../../../lib/utils';
import MessageStatusIcon from './MessageStatusIcon';
import type { ChatMessageDateProps } from './types';

function MessageDate({
  time,
  status,
  isMe,
  isRead,
  className,
  onRetry,
  retrying,
}: ChatMessageDateProps) {
  return (
    <span
      className={cn(
        'float-right ml-2 inline-flex items-center gap-1 text-[12px]',
        isMe ? 'text-foreground/55' : 'text-foreground/60',
        className,
      )}
    >
      <span>{formatChatTime(time)}</span>
      {isMe && (
        <MessageStatusIcon status={status} isRead={isRead} onRetry={onRetry} retrying={retrying} />
      )}
    </span>
  );
}

export default memo(MessageDate);
