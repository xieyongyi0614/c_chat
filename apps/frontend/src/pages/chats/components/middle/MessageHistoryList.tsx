import { memo } from 'react';
import { useMessageStore } from '@c_chat/frontend/stores';
import MessageGroup from './message/MessageGroup';

const MessageHistoryList = () => {
  const msgGroups = useMessageStore((s) => s.groups);

  console.log('message list render');

  return (
    <div className="flex size-full flex-1">
      <div className="chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden">
        <div className="chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4">
          {msgGroups.map((group) => (
            <MessageGroup key={group.dateKey} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
};
export default memo(MessageHistoryList);
