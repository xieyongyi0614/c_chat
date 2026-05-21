import { memo } from 'react';
import MessageItem from './MessageItem';

interface OwnerProps {
  dateKey: string;
  groupIds: string[];
}

const MessageGroup = ({ dateKey, groupIds }: OwnerProps) => {
  console.log('messageGroup render');
  return (
    <>
      <div className="text-center text-xs">{dateKey}</div>
      {groupIds.map((groupId) => {
        return <MessageItem key={groupId} groupId={groupId} isRead={true} />;
      })}
    </>
  );
};

export default memo(MessageGroup);
