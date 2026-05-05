import { memo } from 'react';
import EmptyConversation from './EmptyConversation';
import { useChatStore } from '@c_chat/frontend/stores';
import { Avatar, AvatarFallback, AvatarImage, Button, cn } from '@c_chat/ui';
import { ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';

import HistoryMessageList from './MessageHistoryList';
import { ChatInput } from './input/ChatInput';

interface RightSideProps {
  openCreateConversationDialog: (open: boolean) => void;
}

const MiddleColumn = (props: RightSideProps) => {
  const { openCreateConversationDialog } = props;

  const { selectedConversation, selectedUserForDraft, setSelectedUserForDraft } = useChatStore();

  const activeTitle = (() => {
    if (selectedConversation) {
      return selectedConversation.targetName;
    }
    return selectedUserForDraft?.nickname || '无';
  })();

  if (!selectedConversation && !selectedUserForDraft) {
    return (
      <EmptyConversation openCreateConversationDialog={() => openCreateConversationDialog(true)} />
    );
  }

  return (
    <div
      className={cn(
        'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        selectedUserForDraft && 'start-0 flex',
      )}
    >
      <div className="mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md">
        <div className="flex gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="-ms-2 h-full sm:hidden"
            onClick={() => {
              setSelectedUserForDraft(null);
            }}
          >
            <ArrowLeft className="rtl:rotate-180" />
          </Button>
          <div className="flex items-center gap-2 lg:gap-4">
            <Avatar className="size-9 lg:size-11">
              <AvatarImage
                src={selectedConversation?.targetAvatar}
                alt="@shadcn"
                className="grayscale"
              />
              <AvatarFallback>
                {selectedConversation?.targetName?.toUpperCase()?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="col-start-2 row-span-2 text-sm font-medium lg:text-base">
                {activeTitle}
              </span>
            </div>
          </div>
        </div>

        <div className="-me-1 flex items-center gap-1 lg:gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
          >
            <Video size={22} className="stroke-muted-foreground" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
          >
            <Phone size={22} className="stroke-muted-foreground" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6"
          >
            <MoreVertical className="stroke-muted-foreground sm:size-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4">
        <HistoryMessageList />
        <ChatInput />
      </div>
    </div>
  );
};

export default memo(MiddleColumn);
