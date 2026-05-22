import type { MessageStatusEnum } from '@c_chat/shared-types';
import { formatChatTime } from '@c_chat/shared-utils';
import { cn } from '@c_chat/ui';
import { memo, type ComponentProps } from 'react';
import MessageStatusIcon from './MessageStatusIcon';

interface MessageDateProps extends ComponentProps<'div'> {
  time: number;
  status: MessageStatusEnum;
  isMe: boolean;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}
const MessageDate = (props: MessageDateProps) => {
  const { time, status, isMe, isRead, className, onRetry, retrying } = props;
  return (
    <span
      className={cn(
        'float-right ml-2 inline-flex items-center gap-1 text-[12px]',
        isMe ? 'text-black/55' : 'text-foreground/60',
        className,
      )}
    >
      <span>{formatChatTime(time)}</span>
      {isMe && (
        <MessageStatusIcon status={status} isRead={isRead} onRetry={onRetry} retrying={retrying} />
      )}
    </span>
  );
};
export default memo(MessageDate);
