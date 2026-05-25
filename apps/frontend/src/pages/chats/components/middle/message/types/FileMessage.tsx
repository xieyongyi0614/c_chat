import { memo } from 'react';
import { MessageStatus, type LocalMessageListItem } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';
import { FileIcon } from 'lucide-react';
import { formatFileSize } from '@c_chat/shared-utils';
import MessageDate from '../MessageDate';

interface FileMessageProps {
  msg: LocalMessageListItem;
  isMe: boolean;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

const FileMessage = ({ msg, isMe, onRetry, retrying }: FileMessageProps) => {
  const fileName = msg.fileName || '文件';

  return (
    <div className="w-[200px]">
      <a
        href={`http://localhost:3001${msg.content}`}
        target="_blank"
        rel="noreferrer"
        download
        className={cn(
          'group flex items-center gap-3 rounded-lg  transition-colors',
          'border-gray-200 dark:border-gray-700',
        )}
      >
        {/* 文件图标 */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--message-green)] dark:bg-blue-900/30 transition-colors">
          <FileIcon className="w-5 h-5 text-white dark:text-blue-400" />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{fileName}</p>
          {msg.status === MessageStatus.uploading ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${msg.progress || 0}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500">{msg.progress || 0}%</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {msg.fileSize ? formatFileSize(msg.fileSize) : '0B'}
              <MessageDate
                time={msg.createTime}
                status={msg.status}
                isMe={isMe}
                isRead={true}
                onRetry={onRetry}
                retrying={retrying}
              />
            </p>
          )}
        </div>

        {/* 下载按钮 */}
        {/* <div className="flex-shrink-0 flex items-center gap-2">
          {msg.status !== MessageStatus.fail && (
            <Download className="w-4 h-4 text-gray-400 group-hover:text-[var(--message-green)] transition-colors opacity-0 group-hover:opacity-100" />
          )}
        </div> */}
      </a>
    </div>
  );
};

export default memo(FileMessage);
