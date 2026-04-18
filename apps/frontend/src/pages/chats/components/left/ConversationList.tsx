import { useChatStore } from '@c_chat/frontend/stores';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import { Avatar, AvatarFallback, AvatarImage, cn, ScrollArea, Separator } from '@c_chat/ui';
import { Fragment, memo } from 'react';
interface ConversationListProps {
  list: LocalConversationListItem[];
}
const ConversationList = (props: ConversationListProps) => {
  const { list } = props;
  const { selectedConversation, setSelectedConversation, setSelectedUserForDraft } = useChatStore();

  return (
    <ScrollArea className="-mx-3 h-full overflow-auto p-3" type="auto">
      {list.map((convo) => {
        const {
          id,
          lastMsgContent,
          targetId,
          type,
          userNickname,
          userAvatar,
          groupName,
          groupAvatar,
        } = convo;
        const displayName = type === 1 ? userNickname || targetId : groupName || targetId;
        const avatarUrl = type === 1 ? userAvatar : groupAvatar;
        const avatarFallback = displayName?.slice(0, 2).toUpperCase() || '??';

        return (
          <Fragment key={id}>
            <button
              type="button"
              className={cn(
                'group hover:bg-accent hover:text-accent-foreground',
                `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                selectedConversation?.id === id && 'sm:bg-muted',
              )}
              onClick={() => {
                setSelectedConversation(convo);
                setSelectedUserForDraft(null);
              }}
            >
              <div className="flex gap-2">
                <Avatar>
                  <AvatarImage src={avatarUrl} alt="@shadcn" className="grayscale" />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="col-start-2 row-span-2 font-medium">{displayName}</span>
                  <span className="col-start-2 row-span-2 row-start-2 line-clamp-2 text-ellipsis text-muted-foreground group-hover:text-accent-foreground/90">
                    {lastMsgContent || 'No messages'}
                  </span>
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
