import { useUserStore } from '@c_chat/frontend/stores';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { memo } from 'react';

interface MessageStatusIconProps {
  msg: LocalMessageListItem;
  isRead: boolean;
}
const MessageStatusIcon = (props: MessageStatusIconProps) => {
  const { msg, isRead } = props;
  const userId = useUserStore((s) => s.userInfo?.id);
  const isMe = msg.senderId === userId;

  if (!isMe) return null;

  return (
    <span className="inline-flex w-4 justify-center">
      {msg.status === MessageStatusEnum.fail && (
        <span className="text-red-500 text-[10px] font-bold">!</span>
      )}
      {msg.status === MessageStatusEnum.success &&
        (isRead ? (
          <span className="text-blue-400 text-[10px]">✓✓</span>
        ) : (
          <span className="text-[10px]">✓</span>
        ))}
    </span>
  );
};

export default memo(MessageStatusIcon);
