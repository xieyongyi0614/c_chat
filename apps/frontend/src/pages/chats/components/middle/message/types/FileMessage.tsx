import { memo } from 'react';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';
import { FileIcon, Download } from 'lucide-react';

interface FileMessageProps {
  msg: LocalMessageListItem;
  isMe: boolean;
  isRead: boolean;
}

const FileMessage = ({ msg, isMe, isRead }: FileMessageProps) => {
  const getStatusIcon = () => {
    if (!isMe) return null;

    if (msg.status === MessageStatusEnum.fail) {
      return <span className="text-red-500 text-[10px] font-bold">!</span>;
    }

    if (msg.status === MessageStatusEnum.success) {
      return isRead ? (
        <span className="text-blue-400 text-[10px]">✓✓</span>
      ) : (
        <span className="text-[10px]">✓</span>
      );
    }

    return <span className="opacity-40 text-[10px]">&#8226;</span>;
  };

  // 从 content（URL）中提取文件名
  const fileName = msg.content.split('/').pop() || '文件';
  const isUploading = msg.status === MessageStatusEnum.uploading;

  return (
    <div className="w-full max-w-xs">
      <a
        href={`http://localhost:3001${msg.content}`}
        target="_blank"
        rel="noreferrer"
        download
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg border transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-900',
          'border-gray-200 dark:border-gray-700',
        )}
      >
        {/* 文件图标 */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 transition-colors">
          <FileIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{fileName}</p>
          {isUploading ? (
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
              {msg.status === MessageStatusEnum.fail ? '上传失败' : '已上传'}
            </p>
          )}
        </div>

        {/* 下载按钮 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {msg.status !== MessageStatusEnum.fail && (
            <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" />
          )}
          {isMe && (
            <span className="inline-flex w-4 justify-center text-[10px]">{getStatusIcon()}</span>
          )}
        </div>
      </a>
    </div>
  );
};

export default memo(FileMessage);
