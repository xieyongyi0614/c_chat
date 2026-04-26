import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { formatCompactTime } from '@c_chat/shared-utils';
import { cn } from '@c_chat/ui';
import { memo } from 'react';

interface MessageItemProps {
  msg: LocalMessageListItem;
}
const MessageItem = (props: MessageItemProps) => {
  const { msg } = props;
  const { userInfo } = useUserStore();
  const { selectedConversation } = useChatStore();
  const isMe = msg.senderId === userInfo?.id;
  const isRead = selectedConversation && selectedConversation?.lastReadMessageId >= msg.msgId;
  const renderContent = () => {
    if (msg.type === 1) {
      return (
        <img
          src={msg.content}
          alt="图片消息"
          className="max-h-48 w-full max-w-full rounded-md object-contain"
        />
      );
    }

    if (msg.type === 2) {
      const fileName = msg.content.split('/').pop() || '文件下载';
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
    <div
      className={cn(
        'chat-box max-w-72 px-3 py-2 wrap-break-word shadow-lg',
        isMe
          ? 'self-end rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground/75'
          : 'self-start rounded-[16px_16px_16px_0] bg-muted',
      )}
    >
      {renderContent()}
      <span
        className={cn(
          'mt-1 block text-xs font-light text-foreground/75 italic flex justify-between',
          msg.senderId === userInfo?.id && 'text-end text-primary-foreground/85',
        )}
      >
        {formatCompactTime(msg.updateTime)}

        <span className="ml-2">{isMe ? '送达' : isRead && '已读'}</span>
      </span>
    </div>
  );
};

export default memo(MessageItem);
