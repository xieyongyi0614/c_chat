import { memo } from 'react';
import { cn } from '@c_chat/ui';
import { formatCompactTime } from '@c_chat/shared-utils';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { useUserStore } from '@c_chat/frontend/stores';

interface MessageItemProps {
  msg: LocalMessageListItem;
  isRead: boolean;
}

const MessageItem = ({ msg, isRead }: MessageItemProps) => {
  const userId = useUserStore((s) => s.userInfo?.id);
  const isMe = msg.senderId === userId;

  const renderStatusIcon = () => {
    if (!isMe) return null;

    if (msg.status === MessageStatusEnum.fail) {
      return <span className="text-red-500">!</span>;
    }

    if (msg.status === MessageStatusEnum.success) {
      return isRead ? (
        <span className="text-blue-400 text-[10px]">✓✓</span>
      ) : (
        <span className="text-[10px]">✓</span>
      );
    }

    return <span className="opacity-40 text-[10px]">•</span>;
  };

  const renderContent = () => {
    if (msg.type === 1) {
      return (
        <img src={msg.content} alt="图片" className="max-h-60 w-full rounded-lg object-contain" />
      );
    }

    if (msg.type === 2) {
      const fileName = msg.content.split('/').pop() || '文件';
      return (
        <a
          href={msg.content}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline break-all"
        >
          {fileName}
        </a>
      );
    }

    if (msg.type === 3) {
      return (
        <a
          href={msg.content}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline break-all"
        >
          {msg.content}
        </a>
      );
    }

    return <span className="whitespace-pre-wrap break-words">{msg.content}</span>;
  };

  return (
    <div className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-3 py-2 shadow-sm',
          isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm',
        )}
      >
        <div className="text-sm">{renderContent()}</div>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            isMe ? 'text-primary-foreground/70' : 'text-foreground/60',
          )}
        >
          <span>{formatCompactTime(msg.createTime)}</span>
          {isMe && <span className="inline-flex w-4 justify-center">{renderStatusIcon()}</span>}
        </div>
      </div>
    </div>
  );
};

export default memo(MessageItem);
