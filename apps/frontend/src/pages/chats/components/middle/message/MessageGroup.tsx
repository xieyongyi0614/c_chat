import type { MessageGroup } from '@c_chat/frontend/stores';
import { memo } from 'react';
import MessageItem from './MessageItem';

interface OwnerProps {
  group: MessageGroup;
}
const MessageGroup = ({ group }: OwnerProps) => {
  return (
    <>
      {group.messages.map((msg) => (
        <MessageItem key={msg.id} msg={msg} isRead={true} />
      ))}
      <div className="text-center text-xs">{group.dateKey}</div>
    </>
  );
};
export default memo(MessageGroup);
