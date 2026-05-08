import { MessageStatusEnum } from '@c_chat/shared-types';
import { memo } from 'react';

interface MessageStatusIconProps {
  status: MessageStatusEnum;
  isRead: boolean;
}
const MessageStatusIcon = (props: MessageStatusIconProps) => {
  const { status, isRead } = props;

  return (
    <span className="inline-flex w-4 justify-center">
      {status === MessageStatusEnum.fail && (
        <span className="text-red-500 text-[10px] font-bold">!</span>
      )}
      {status === MessageStatusEnum.success &&
        (isRead ? (
          <span className="text-blue-400 text-[10px]">✓✓</span>
        ) : (
          <span className="text-[10px]">✓</span>
        ))}
    </span>
  );
};

export default memo(MessageStatusIcon);
