import { forwardRef, memo, useImperativeHandle, useMemo, useState } from 'react';
import LeftColumnHeader from './LeftColumnHeader';
import { useChatStore } from '@c_chat/frontend/stores';
import { ConversationType, type LocalConversationListItem } from '@c_chat/shared-types';
import ConversationList from './ConversationList';
export interface LeftColumnRef {
  filterConversations: LocalConversationListItem[];
}

interface LeftColumnProps {
  openCreateConversationDialog: (open: boolean) => void;
}
const LeftColumn = forwardRef<LeftColumnRef, LeftColumnProps>((props, ref) => {
  const { openCreateConversationDialog } = props;
  const { conversationData, selectedConversationFolder } = useChatStore();
  const [search, setSearch] = useState('');

  const filterConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const folderFiltered = (conversationData.list ?? []).filter((item) => {
      if (selectedConversationFolder === 'unread') return (item.unreadCount ?? 0) > 0;
      if (selectedConversationFolder === 'personal') return item.type === ConversationType.Single;
      if (selectedConversationFolder === 'groups') return item.type === ConversationType.Group;
      if (selectedConversationFolder === 'archive') return false;
      return true;
    });

    if (!keyword) return folderFiltered;
    return folderFiltered.filter((item) => item.targetName.toLowerCase().includes(keyword));
  }, [conversationData.list, search, selectedConversationFolder]);

  useImperativeHandle(ref, () => ({
    filterConversations,
  }));

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 2xl:w-80">
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
