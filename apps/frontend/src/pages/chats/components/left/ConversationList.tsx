import { useChatStore } from '@c_chat/frontend/stores';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import { ScrollArea, Separator } from '@c_chat/ui';
import { Fragment, memo, useCallback } from 'react';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  list: LocalConversationListItem[];
}

const ConversationList = (props: ConversationListProps) => {
  const { list } = props;
  const selectedConversationId = useChatStore((s) => s.selectedConversation?.id);
  const setSelectedConversation = useChatStore((s) => s.setSelectedConversation);
  const setSelectedUserForDraft = useChatStore((s) => s.setSelectedUserForDraft);

  const handleSelect = useCallback(
    (convo: LocalConversationListItem) => {
      setSelectedConversation(convo);
      setSelectedUserForDraft(null);
    },
    [setSelectedConversation, setSelectedUserForDraft],
  );

  return (
    <ScrollArea className="-mx-3 h-full overflow-auto p-3" type="auto">
      {list.map((convo) => (
        <Fragment key={convo.id}>
          <ConversationItem
            conversation={convo}
            selected={selectedConversationId === convo.id}
            onSelect={handleSelect}
          />
          <Separator className="my-1" />
        </Fragment>
      ))}
    </ScrollArea>
  );
};

export default memo(ConversationList);
