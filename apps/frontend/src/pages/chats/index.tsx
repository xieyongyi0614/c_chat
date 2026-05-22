import { useRef, useState } from 'react';

import { NewChat } from './components/new-chat';
import { Main } from '@c_chat/ui';
import type { UserTypes } from '@c_chat/shared-types';
import { useChatsData } from './hooks/useChatsData';
import { useChatStore } from '@c_chat/frontend/stores';
import MiddleColumn from './components/middle/MiddleColumn';
import LeftColumn, { type LeftColumnRef } from './components/left/LeftColumn';
import type { LocalConversationListItem } from '@c_chat/shared-types';

export function Chats() {
  const { setSelectedConversation, setSelectedUserForDraft } = useChatStore();

  const { loadOlderMessages, historyState } = useChatsData();
  const [createConversationDialogOpened, setCreateConversationDialog] = useState(false);
  const leftColumnRef = useRef<LeftColumnRef>(null);

  const handleSelectUserFromNewChat = (user: UserTypes.UserListItem) => {
    const existingConvo = leftColumnRef.current?.filterConversations.find(
      (c) => c.targetId === user.id,
    );
    if (existingConvo) {
      setSelectedConversation(existingConvo);
      setSelectedUserForDraft(null);
    } else {
      setSelectedConversation(null);
      setSelectedUserForDraft(user);
    }
  };

  const handleSelectGroupFromNewChat = (conversation: LocalConversationListItem) => {
    setSelectedConversation(conversation);
    setSelectedUserForDraft(null);
  };

  return (
    <Main fixed className="px-4 py-4 ">
      <section className="flex h-full min-w-0 gap-6">
        {/* LeftColumn */}
        <LeftColumn
          ref={leftColumnRef}
          openCreateConversationDialog={setCreateConversationDialog}
        />

        {/* MiddleColumn */}
        <MiddleColumn
          historyState={historyState}
          loadOlderMessages={loadOlderMessages}
          openCreateConversationDialog={setCreateConversationDialog}
        />
      </section>
      <NewChat
        onSelectUser={handleSelectUserFromNewChat}
        onSelectGroup={handleSelectGroupFromNewChat}
        onOpenChange={setCreateConversationDialog}
        open={createConversationDialogOpened}
      />
    </Main>
  );
}
