'use client';

import { Avatar, AvatarFallback, AvatarImage, Badge, cn } from '@c_chat/ui';
import { generateLastMsgContent, formatCompactTime } from '@c_chat/shared-utils';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import type { LocalConversationListItem } from '@c_chat/shared-types';

interface ConversationItemProps {
  conversation: LocalConversationListItem;
  selected: boolean;
  onSelect: (conversation: LocalConversationListItem) => void;
}

export function ConversationItem({ conversation, selected, onSelect }: ConversationItemProps) {
  const unread = conversation.unreadCount ?? 0;
  const lastMsg = generateLastMsgContent(MESSAGE_TYPE.Text, conversation.lastMsgContent);

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
        selected && 'bg-accent',
      )}
    >
      <Avatar className="size-12 shrink-0">
        <AvatarImage src={conversation.targetAvatar} alt={conversation.targetName} />
        <AvatarFallback>{conversation.targetName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-medium">{conversation.targetName}</h3>
          {conversation.lastMsgTime > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatCompactTime(conversation.lastMsgTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-muted-foreground">{lastMsg || '暂无消息'}</p>
          {unread > 0 && (
            <Badge variant="destructive" className="shrink-0">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
