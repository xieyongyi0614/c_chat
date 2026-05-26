import { ConversationType, type LocalConversationListItem } from '@c_chat/shared-types';
import { formatRelativeTime } from '@c_chat/shared-utils';
import { Avatar, AvatarFallback, AvatarImage, cn } from '@c_chat/ui';
import { Users } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { getChatAvatarFallbackClass } from '../chat-avatar-style';

interface ConversationItemProps {
  conversation: LocalConversationListItem;
  selected: boolean;
  onSelect: (conversation: LocalConversationListItem) => void;
}

const formatUnreadCount = (count?: number) => {
  if (!count) return null;
  return count > 99 ? '99+' : String(count);
};

const ConversationItem = (props: ConversationItemProps) => {
  const { conversation, selected, onSelect } = props;
  const { lastMsgContent, lastMsgTime, targetName, targetAvatar, unreadCount } = conversation;

  const isGroup = conversation.type === ConversationType.Group;
  const avatarFallback = useMemo(() => targetName?.slice(0, 2).toUpperCase() || '??', [targetName]);
  const displayTime = useMemo(
    () => (lastMsgTime ? formatRelativeTime(lastMsgTime) : null),
    [lastMsgTime],
  );
  const unreadText = useMemo(() => formatUnreadCount(unreadCount), [unreadCount]);

  const handleClick = useCallback(() => onSelect(conversation), [conversation, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group hover:bg-muted hover:text-accent-foreground relative',
        'flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-md px-2 py-2 text-start text-sm',
        selected && 'sm:bg-muted',
      )}
    >
      <div className="relative size-11 shrink-0">
        <Avatar className="size-11">
          <AvatarImage
            src={targetAvatar}
            alt={targetName ?? 'conversation avatar'}
            className="rounded-full"
          />
          <AvatarFallback className={getChatAvatarFallbackClass(targetName, 'text-lg')}>
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {isGroup && (
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-foreground">
                <Users className="size-3.5" />
              </span>
            )}
            <span className="block min-w-0 truncate font-medium">{targetName ?? '未命名会话'}</span>
          </div>
          {displayTime && (
            <span className="max-w-16 truncate whitespace-nowrap text-xs text-muted-foreground">
              {displayTime}
            </span>
          )}
        </div>

        <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="block min-w-0 truncate whitespace-nowrap text-sm text-muted-foreground group-hover:text-accent-foreground/90">
            {lastMsgContent || (isGroup ? '群聊，点击查看成员' : '暂无消息')}
          </span>
          {unreadText && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
              {unreadText}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default memo(ConversationItem);
