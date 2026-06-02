import { memo } from 'react';
import { useMessageStore } from '@c_chat/frontend/stores';
import { useShallow } from 'zustand/react/shallow';
import MessageItem from './MessageItem';
import type { SenderProfile } from './senderProfile';

interface OwnerProps {
  dateKey: string;
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, SenderProfile>;
}

const MessageGroup = ({ dateKey, isGroupConversation, senderProfiles }: OwnerProps) => {
  console.log('message group render');
  const groupIds = useMessageStore(useShallow((s) => [...(s.groups.get(dateKey) ?? [])].reverse()));

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
