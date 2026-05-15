import { MessageStatusEnum } from '@c_chat/shared-types';
import { Check, CheckCheck } from 'lucide-react';
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
          // <span className="text-blue-400 text-[10px]">✓✓</span>
          <CheckCheck className="h-3.5 w-3.5 text-[#4CAF50]" />
        ) : (
          // <span className="text-[10px]">✓</span>
          <Check className="h-3.5 w-3.5 text-[#4CAF50]" />
        ))}
    </span>
  );
};

export default memo(MessageStatusIcon);
