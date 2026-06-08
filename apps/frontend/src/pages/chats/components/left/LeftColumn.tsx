import { forwardRef, memo, useImperativeHandle, useMemo, useState } from 'react';
import { Edit } from 'lucide-react';
import { useChatStore } from '@c_chat/frontend/stores';
import { ConversationType, type LocalConversationListItem } from '@c_chat/shared-types';
import { Button, ConversationSidebar } from '@c_chat/ui';
import { CHAT_CONVERSATION_SIDEBAR_LABELS } from '@c_chat/shared-config';

export interface LeftColumnRef {
  filterConversations: LocalConversationListItem[];
}

interface LeftColumnProps {
  openCreateConversationDialog: (open: boolean) => void;
}

const LeftColumn = forwardRef<LeftColumnRef, LeftColumnProps>((props, ref) => {
  const { openCreateConversationDialog } = props;
  const conversationData = useChatStore((state) => state.conversationData);
  const selectedConversationFolder = useChatStore((state) => state.selectedConversationFolder);
  const selectedConversationId = useChatStore((state) => state.selectedConversation?.id);
  const setSelectedConversation = useChatStore((state) => state.setSelectedConversation);
  const setSelectedUserForDraft = useChatStore((state) => state.setSelectedUserForDraft);
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

  const handleSelectConversation = (conversation: LocalConversationListItem) => {
    setSelectedConversation(conversation);
    setSelectedUserForDraft(null);
  };

  return (
    <ConversationSidebar
      conversations={filterConversations}
      selectedConversationId={selectedConversationId}
      search={search}
      onSearchChange={setSearch}
      onSelectConversation={handleSelectConversation}
      headerAction={
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={CHAT_CONVERSATION_SIDEBAR_LABELS.createConversation}
          onClick={() => openCreateConversationDialog(true)}
          className="rounded-lg"
        >
          <Edit className="stroke-muted-foreground" />
        </Button>
      }
      labels={{
        title: CHAT_CONVERSATION_SIDEBAR_LABELS.title,
        searchPlaceholder: CHAT_CONVERSATION_SIDEBAR_LABELS.searchPlaceholder,
        searchLabel: CHAT_CONVERSATION_SIDEBAR_LABELS.searchLabel,
        emptyMessage: CHAT_CONVERSATION_SIDEBAR_LABELS.emptyMessage,
        noMessage: CHAT_CONVERSATION_SIDEBAR_LABELS.noMessage,
        groupNoMessage: CHAT_CONVERSATION_SIDEBAR_LABELS.groupNoMessage,
      }}
    />
  );
});

export default memo(LeftColumn);
