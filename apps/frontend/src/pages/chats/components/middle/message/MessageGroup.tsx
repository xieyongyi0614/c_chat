import { memo } from 'react';
import MessageItem from './MessageItem';
import type { SenderProfile } from './senderProfile';

interface OwnerProps {
  dateKey: string;
  groupIds: string[];
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, SenderProfile>;
}

const MessageGroup = ({ dateKey, groupIds, isGroupConversation, senderProfiles }: OwnerProps) => {
  console.log('messageGroup render');
  return (
    <>
      <div className="text-center text-xs">{dateKey}</div>
      {groupIds.map((groupId) => {
        return (
          <MessageItem
            key={groupId}
            groupId={groupId}
            isRead={true}
            isGroupConversation={isGroupConversation}
            senderProfiles={senderProfiles}
          />
        );
      })}
    </>
  );
};

export default memo(MessageGroup);
