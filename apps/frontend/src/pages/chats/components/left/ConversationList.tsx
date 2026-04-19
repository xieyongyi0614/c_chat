import { useChatStore } from '@c_chat/frontend/stores';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import { formatRelativeTime } from '@c_chat/shared-utils';
import { Avatar, AvatarFallback, AvatarImage, cn, ScrollArea, Separator } from '@c_chat/ui';
import { Fragment, memo } from 'react';
interface ConversationListProps {
  list: LocalConversationListItem[];
}
const ConversationList = (props: ConversationListProps) => {
  const { list } = props;
  const {
    selectedConversation,
    setSelectedConversation,
    setSelectedUserForDraft,
    clearUnreadCount,
  } = useChatStore();

  return (
    <ScrollArea className="-mx-3 h-full overflow-auto p-3" type="auto">
      {list.map((convo) => {
        const {
          id,
          lastMsgContent,
          lastMsgTime,
          targetId,
          type,
          userNickname,
          userAvatar,
          groupName,
          groupAvatar,
          unreadCount,
        } = convo;
        const displayName = type === 1 ? userNickname || targetId : groupName || targetId;
        const avatarUrl = type === 1 ? userAvatar : groupAvatar;
        const avatarFallback = displayName?.slice(0, 2).toUpperCase() || '??';
        console.log('lastMsgTime,', lastMsgTime);
        const displayTime = lastMsgTime ? formatRelativeTime(lastMsgTime) : null;

        return (
          <Fragment key={id}>
            <button
              type="button"
              className={cn(
                'group hover:bg-accent hover:text-accent-foreground relative',
                `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                selectedConversation?.id === id && 'sm:bg-muted',
              )}
              onClick={() => {
                setSelectedConversation(convo);
                setSelectedUserForDraft(null);
                // 点击会话时清除未读数
                if (unreadCount && unreadCount > 0) {
                  clearUnreadCount(id);
                }
              }}
            >
              <div className="flex gap-2">
                <Avatar>
                  <AvatarImage src={avatarUrl} alt="@shadcn" className="grayscale" />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{displayName}</span>
                    {displayTime && (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {displayTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="col-start-2 row-span-2 line-clamp-1 text-ellipsis text-muted-foreground group-hover:text-accent-foreground/90 truncate max-w-[160px]">
                      {lastMsgContent || 'No messages'}
                    </span>
                    {unreadCount !== undefined && unreadCount > 0 && (
                      <span className="ml-2 shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
            <Separator className="my-1" />
          </Fragment>
        );
      })}
    </ScrollArea>
  );
};
export default memo(ConversationList);
