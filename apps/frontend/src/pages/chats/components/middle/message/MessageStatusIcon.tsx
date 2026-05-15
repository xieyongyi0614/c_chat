import { MessageStatusEnum } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';
import { Check, CheckCheck, CircleAlert, Clock } from 'lucide-react';
import { memo } from 'react';

interface MessageStatusIconProps {
  status: MessageStatusEnum;
  isRead: boolean;
}
const MessageStatusIcon = (props: MessageStatusIconProps) => {
  const { status, isRead } = props;
  const iconStyle = 'h-3.5 w-3.5 text-[var(--message-green)]';

  return (
    <span className="inline-flex w-4 justify-center">
      {status === MessageStatusEnum.fail && (
        <CircleAlert className={cn(iconStyle, 'text-[var(--destructive)]')} />
      )}
      {status === MessageStatusEnum.success &&
        (isRead ? <CheckCheck className={iconStyle} /> : <Check className={iconStyle} />)}
      {status === MessageStatusEnum.sending && <Clock className={iconStyle} />}
    </span>
  );
};

export default memo(MessageStatusIcon);
