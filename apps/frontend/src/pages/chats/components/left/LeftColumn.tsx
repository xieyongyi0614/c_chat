import { forwardRef, memo, useImperativeHandle, useMemo, useState } from 'react';
import LeftColumnHeader from './LeftColumnHeader';
import { useChatStore } from '@c_chat/frontend/stores';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import ConversationList from './ConversationList';
export interface LeftColumnRef {
  filterConversations: LocalConversationListItem[];
}

interface LeftColumnProps {
  openCreateConversationDialog: (open: boolean) => void;
}
const LeftColumn = forwardRef<LeftColumnRef, LeftColumnProps>((props, ref) => {
  const { openCreateConversationDialog } = props;
  const { conversationData } = useChatStore();
  const [search, setSearch] = useState('');

  const filterConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return conversationData.list ?? [];
    return (
      conversationData.list.filter((item) => item.targetId.toLowerCase().includes(keyword)) ?? []
    );
  }, [conversationData.list, search]);

  useImperativeHandle(ref, () => ({
    filterConversations,
  }));

  return (
    <div className="flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80">
      <LeftColumnHeader
        search={search}
        onSearchChange={setSearch}
        openCreateConversationDialog={openCreateConversationDialog}
      />
      <ConversationList list={filterConversations} />
    </div>
  );
});
export default memo(LeftColumn);
