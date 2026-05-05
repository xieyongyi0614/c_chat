import { useRef, useState } from 'react';

import { NewChat } from './components/new-chat';
import { Main } from '@c_chat/ui';
import type { UserTypes } from '@c_chat/shared-types';
import { useChatsData } from './hooks/useChatsData';
import { useChatStore } from '@c_chat/frontend/stores';
import MiddleColumn from './components/middle/MiddleColumn';
import LeftColumn, { type LeftColumnRef } from './components/left/LeftColumn';

export function Chats() {
  const { setSelectedConversation, setSelectedUserForDraft } = useChatStore();

  useChatsData();
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

  return (
    <Main fixed className="px-4 py-4 ">
      <section className="flex h-full gap-6">
        {/* LeftColumn */}
        <LeftColumn
          ref={leftColumnRef}
          openCreateConversationDialog={setCreateConversationDialog}
        />

        {/* MiddleColumn */}
        <MiddleColumn openCreateConversationDialog={setCreateConversationDialog} />
      </section>
      <NewChat
        onSelectUser={handleSelectUserFromNewChat}
        onOpenChange={setCreateConversationDialog}
        open={createConversationDialogOpened}
      />
    </Main>
  );
}
