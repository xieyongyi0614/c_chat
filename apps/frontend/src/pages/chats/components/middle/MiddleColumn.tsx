import { memo, useState } from 'react';
import EmptyConversation from './EmptyConversation';
import { useChatStore } from '@c_chat/frontend/stores';
import { ConversationHeader, cn } from '@c_chat/ui';

import HistoryMessageList from './MessageHistoryList';
import { ChatInput } from './input/ChatInput';
import { ConversationType } from '@c_chat/shared-types';
import { GroupDetailDialog } from './GroupDetailDialog';
import { getChatAvatarFallbackClass } from '../chat-avatar-style';

interface RightSideProps {
  openCreateConversationDialog: (open: boolean) => void;
  loadOlderMessages: () => Promise<boolean>;
  historyState: {
    isLoadingLatest: boolean;
    isLoadingOlder: boolean;
    hasMoreOlder: boolean;
  };
}

const MiddleColumn = (props: RightSideProps) => {
  const { historyState, loadOlderMessages, openCreateConversationDialog } = props;

  const { selectedConversation, selectedUserForDraft, setSelectedUserForDraft } = useChatStore();
  const isGroupConversation = selectedConversation?.type === ConversationType.Group;
  const [groupDetailOpen, setGroupDetailOpen] = useState(false);

  const activeTitle =
    selectedConversation?.targetName ??
    selectedUserForDraft?.nickname ??
    selectedUserForDraft?.email;
  const activeAvatar = selectedConversation?.targetAvatar ?? selectedUserForDraft?.avatarUrl;

  if (!selectedConversation && !selectedUserForDraft) {
    return (
      <EmptyConversation openCreateConversationDialog={() => openCreateConversationDialog(true)} />
    );
  }

  return (
    <div
      className={cn(
        'absolute inset-0 start-full z-50 hidden w-full min-w-0 flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        selectedUserForDraft && 'start-0 flex',
      )}
    >
      <ConversationHeader
        title={activeTitle}
        avatarUrl={activeAvatar}
        description="会话信息"
        fallbackClassName={getChatAvatarFallbackClass(activeTitle, 'text-base')}
        showBackButton={Boolean(selectedUserForDraft)}
        onBack={() => {
          setSelectedUserForDraft(null);
        }}
        onMoreClick={() => {
          if (isGroupConversation) {
            setGroupDetailOpen(true);
          }
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4">
        <HistoryMessageList historyState={historyState} loadOlderMessages={loadOlderMessages} />
        <ChatInput />
      </div>
      <GroupDetailDialog
        open={groupDetailOpen}
        conversation={
          selectedConversation?.type === ConversationType.Group ? selectedConversation : null
        }
        onOpenChange={setGroupDetailOpen}
      />
    </div>
  );
};

export default memo(MiddleColumn);
