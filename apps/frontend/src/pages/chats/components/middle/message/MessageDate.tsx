import { useUserStore } from '@c_chat/frontend/stores';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { formatChatTime } from '@c_chat/shared-utils';
import { cn } from '@c_chat/ui';
import { memo, type ComponentProps } from 'react';
import MessageStatusIcon from './MessageStatusIcon';

interface MessageDateProps extends ComponentProps<'div'> {
  msg: LocalMessageListItem;
  isRead: boolean;
}
const MessageDate = (props: MessageDateProps) => {
  const { msg, isRead, className } = props;
  const userId = useUserStore((s) => s.userInfo?.id);
  const isMe = msg.senderId === userId;
  return (
    <div
      className={cn(
        'mt-1 flex items-center justify-end gap-1 text-[10px]',
        isMe ? 'text-primary-foreground/70' : 'text-foreground/60',
        className,
      )}
    >
      <span>{formatChatTime(msg.createTime)}</span>
      {isMe && <MessageStatusIcon status={msg.status} isRead={isRead} />}
    </div>
  );
};
export default memo(MessageDate);
