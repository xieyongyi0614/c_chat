import { memo } from 'react';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { formatCompactTime } from '@c_chat/shared-utils';
import { cn } from '@c_chat/ui';
import { Music, Play } from 'lucide-react';

interface AudioMessageProps {
  msg: LocalMessageListItem;
  isMe: boolean;
  isRead: boolean;
}

const AudioMessage = ({ msg, isMe, isRead }: AudioMessageProps) => {
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

  const fileName = msg.content.split('/').pop() || '音频文件';
  const isUploading = msg.status === MessageStatusEnum.uploading;

  return (
    <div className="w-full max-w-xs">
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg',
          'bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20',
          'border border-purple-200/50 dark:border-purple-800/50',
        )}
      >
        {/* 音频播放按钮 */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 transition-colors">
          <a
            href={`http://localhost:3001${msg.content}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center w-full h-full"
          >
            <Play className="w-5 h-5 text-white fill-white" />
          </a>
        </div>

        {/* 音频信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{fileName}</p>
          {isUploading ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${msg.progress || 0}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500">{msg.progress || 0}%</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Music className="w-3 h-3" />
              {msg.status === MessageStatusEnum.fail ? '上传失败' : '已上传'}
            </p>
          )}
        </div>

        {/* 状态标识 */}
        {isMe && (
          <span className="flex-shrink-0 inline-flex w-4 justify-center text-[10px]">
            {getStatusIcon()}
          </span>
        )}
      </div>

      {/* 时间 */}
      <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
        {formatCompactTime(msg.createTime)}
      </div>
    </div>
  );
};

export default memo(AudioMessage);
