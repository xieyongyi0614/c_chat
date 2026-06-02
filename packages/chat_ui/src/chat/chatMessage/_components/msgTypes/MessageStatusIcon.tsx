import { Check, CheckCheck, CircleAlert, Clock, RefreshCw } from 'lucide-react';
import { memo } from 'react';
import { MessageStatus } from '@c_chat/shared-types';
import { cn } from '../../../../lib/utils';
import type { ChatMessageStatusProps } from './types';

const iconClassName = 'size-3.5 text-[var(--message-green)]';

function MessageStatusIcon({ status, isRead, onRetry, retrying }: ChatMessageStatusProps) {
  return (
    <span className="inline-flex w-4 justify-center">
      {status === MessageStatus.fail && (
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center text-destructive"
          disabled={retrying}
          onClick={(event) => {
            event.stopPropagation();
            onRetry?.();
          }}
          title="重发"
        >
          {retrying ? (
            <RefreshCw className={cn(iconClassName, 'animate-spin text-destructive')} />
          ) : (
            <CircleAlert className={cn(iconClassName, 'text-destructive')} />
          )}
        </button>
      )}
      {status === MessageStatus.success &&
        (isRead ? <CheckCheck className={iconClassName} /> : <Check className={iconClassName} />)}
      {status === MessageStatus.sending && <Clock className={iconClassName} />}
    </span>
  );
}

export default memo(MessageStatusIcon);
