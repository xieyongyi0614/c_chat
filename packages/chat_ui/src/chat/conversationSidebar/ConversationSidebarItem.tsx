import { memo } from 'react';
import { Users } from 'lucide-react';
import { ConversationType } from '@c_chat/shared-types';
import { formatRelativeTime } from '@c_chat/shared-utils';
import { ChatAvatar } from '../chat-avatar';
import { cn } from '../../lib/utils';
import type { ConversationSidebarItemProps } from './types';

function formatUnreadCount(count?: number) {
  if (!count) return null;
  return count > 99 ? '99+' : String(count);
}

function ConversationSidebarItemBase({
  conversation,
  selected,
  onSelect,
  formatAvatarUrl,
  labels,
}: ConversationSidebarItemProps) {
  const { lastMsgContent, lastMsgTime, targetName, targetAvatar, unreadCount } = conversation;
  const isGroup = conversation.type === ConversationType.Group;
  const displayTime = lastMsgTime ? formatRelativeTime(lastMsgTime) : null;
  const unreadText = formatUnreadCount(unreadCount);
  const title = targetName || labels?.unnamedConversation || 'Unnamed conversation';
  const lastMessage = lastMsgContent || (isGroup ? labels?.groupNoMessage : labels?.noMessage);

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={cn(
        'group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-md px-2 py-2 text-start text-sm',
        'hover:bg-muted hover:text-accent-foreground',
        selected && 'sm:bg-muted',
      )}
    >
      <ChatAvatar
        id={conversation.id}
        title={targetName}
        avatarUrl={formatAvatarUrl(targetAvatar)}
        alt={labels?.avatarAlt ?? `${targetName ?? 'conversation'} avatar`}
        className="size-11 shrink-0"
        fallbackClassName="text-lg"
      />

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {isGroup ? (
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-foreground">
                <Users className="size-3.5" />
              </span>
            ) : null}
            <span className="block min-w-0 truncate font-medium">{title}</span>
          </div>
          {displayTime ? (
            <span className="max-w-16 truncate text-xs text-muted-foreground">{displayTime}</span>
          ) : null}
        </div>

        <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="block min-w-0 truncate text-sm text-muted-foreground group-hover:text-accent-foreground/90">
            {lastMessage}
          </span>
          {unreadText ? (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
              {unreadText}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export const ConversationSidebarItem = memo(ConversationSidebarItemBase);
