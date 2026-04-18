import { Button } from '@c_chat/ui';
import { MessagesSquare } from 'lucide-react';
import { memo } from 'react';

interface EmptyConversationProps {
  openCreateConversationDialog: () => void;
}
const EmptyConversation = (props: EmptyConversationProps) => {
  const { openCreateConversationDialog } = props;
  return (
    <div className="absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border bg-card shadow-xs sm:static sm:z-auto sm:flex">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-border">
          <MessagesSquare className="size-8" />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold">Your messages</h1>
          <p className="text-sm text-muted-foreground">Send a message to start a chat.</p>
        </div>
        <Button onClick={openCreateConversationDialog}>Send message</Button>
      </div>
    </div>
  );
};

export default memo(EmptyConversation);
