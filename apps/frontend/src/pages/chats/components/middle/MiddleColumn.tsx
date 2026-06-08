import { memo, useState } from 'react';
import { useChatStore } from '@c_chat/frontend/stores';
import { ChatEmptyConversationState, ConversationHeader, cn } from '@c_chat/ui';

import HistoryMessageList from './MessageHistoryList';
import { ChatInput } from './input/ChatInput';
import { ConversationType } from '@c_chat/shared-types';
import { GroupDetailDialog } from './GroupDetailDialog';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';

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

  if (!selectedConversation && !selectedUserForDraft) {
    return (
      <ChatEmptyConversationState
        title="Your messages"
        description="Send a message to start a chat."
        actionLabel="Send message"
        onAction={() => openCreateConversationDialog(true)}
        className="absolute inset-0 start-full z-50 hidden w-full rounded-md border shadow-xs sm:static sm:z-auto sm:flex"
      />
    );
  }

  const activeTitle =
    selectedConversation?.targetName ??
    selectedUserForDraft?.nickname ??
    selectedUserForDraft?.email;
  const activeAvatar = selectedConversation?.targetAvatar ?? selectedUserForDraft?.avatarUrl;
  console.log(selectedConversation, 'selectedConversation');
  const activeId =
    selectedConversation?.id ?? selectedUserForDraft?.id ?? activeTitle ?? activeAvatar ?? '';
  return (
    <div
      className={cn(
        'absolute inset-0 start-full z-50 hidden w-full min-w-0 flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        selectedUserForDraft && 'start-0 flex',
      )}
    >
      <ConversationHeader
        id={activeId}
        title={activeTitle}
        avatarUrl={formatFileUrl(activeAvatar)}
        description="会话信息"
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
