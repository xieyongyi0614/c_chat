import { MessageStatus } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';
import { Check, CheckCheck, CircleAlert, Clock, RefreshCw } from 'lucide-react';
import { memo } from 'react';

interface MessageStatusIconProps {
  status: MessageStatus;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}
const MessageStatusIcon = (props: MessageStatusIconProps) => {
  const { status, isRead, onRetry, retrying } = props;
  const iconStyle = 'h-3.5 w-3.5 text-[var(--message-green)]';

  return (
    <span className="inline-flex w-4 justify-center">
      {status === MessageStatus.fail && (
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center text-[var(--destructive)]"
          disabled={retrying}
          onClick={(event) => {
            event.stopPropagation();
            onRetry?.();
          }}
          title="重发"
        >
          {retrying ? (
            <RefreshCw className={cn(iconStyle, 'animate-spin text-[var(--destructive)]')} />
          ) : (
            <CircleAlert className={cn(iconStyle, 'text-[var(--destructive)]')} />
          )}
        </button>
      )}
      {status === MessageStatus.success &&
        (isRead ? <CheckCheck className={iconStyle} /> : <Check className={iconStyle} />)}
      {status === MessageStatus.sending && <Clock className={iconStyle} />}
    </span>
  );
};

export default memo(MessageStatusIcon);
