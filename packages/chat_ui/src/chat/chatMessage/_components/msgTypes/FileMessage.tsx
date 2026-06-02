import { memo } from 'react';
import { FileIcon } from 'lucide-react';
import { MessageStatus } from '@c_chat/shared-types';
import { formatFileSize } from '@c_chat/shared-utils';
import { cn } from '../../../../lib/utils';
import MessageDate from './MessageDate';
import type { FileMessageProps } from './types';

function FileMessage({ message, isMe, isRead, onRetry, retrying, fileResolver }: FileMessageProps) {
  const fileName = message.fileName || '文件';
  const fileHref = fileResolver.formatFileUrl(message.fileUrl || message.content || '');

  return (
    <div className="w-[200px]">
      <a
        href={fileHref}
        target="_blank"
        rel="noreferrer"
        download
        className={cn('group flex items-center gap-3 rounded-lg transition-colors')}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--message-green)] transition-colors">
          <FileIcon className="size-5 text-primary-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          {message.status === MessageStatus.uploading ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${message.progress || 0}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{message.progress || 0}%</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {message.fileSize ? formatFileSize(message.fileSize) : '0B'}
              <MessageDate
                time={message.createTime}
                status={message.status}
                isMe={isMe}
                isRead={isRead}
                onRetry={onRetry}
                retrying={retrying}
              />
            </p>
          )}
        </div>
      </a>
    </div>
  );
}

export default memo(FileMessage);
