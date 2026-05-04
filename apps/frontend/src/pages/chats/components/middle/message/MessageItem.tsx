import { memo } from 'react';
import { cn } from '@c_chat/ui';
import { formatCompactTime } from '@c_chat/shared-utils';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { useUserStore } from '@c_chat/frontend/stores';

interface MessageItemProps {
  msg: LocalMessageListItem;
  isRead: boolean;
}

const MessageItem = ({ msg, isRead }: MessageItemProps) => {
  const userId = useUserStore((s) => s.userInfo?.id);
  const isMe = msg.senderId === userId;

  const renderStatusIcon = () => {
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

    // uploading 或 sending：显示等待中
    return <span className="opacity-40 text-[10px]">&#8226;</span>;
  };

  const renderTextContent = () => {
    return <span className="whitespace-pre-wrap break-words">{msg.content}</span>;
  };

  const renderImageContent = () => {
    const isUploading = msg.status === MessageStatusEnum.uploading;
    const isSending = msg.status === MessageStatusEnum.sending;
    const isFailed = msg.status === MessageStatusEnum.fail;
    const showOverlay = isUploading || isSending || isFailed;

    return (
      <div className="relative">
        <img
          src={`http://localhost:3001${msg.fileUrl}`}
          alt="图片"
          className={cn('max-h-60 w-full rounded-lg object-contain', showOverlay && 'opacity-60')}
        />

        {/* 上传进度覆盖层 */}
        {isUploading && (
          <div className="absolute inset-0 rounded-lg flex flex-col items-center justify-center bg-black/20">
            <div className="w-3/4 bg-white/40 rounded-full h-1.5 mb-1">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${msg.progress || 0}%` }}
              />
            </div>
            <span className="text-white text-[10px]">{msg.progress || 0}%</span>
          </div>
        )}

        {/* 发送中覆盖层 */}
        {isSending && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}

        {/* 失败覆盖层 */}
        {isFailed && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/30">
            <span className="text-white text-xs">发送失败</span>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (msg.type === 1) {
      return renderImageContent();
    }

    if (msg.type === 2) {
      const fileName = msg.content.split('/').pop() || '文件';
      return (
        <a
          href={msg.content}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline break-all"
        >
          {fileName}
        </a>
      );
    }

    if (msg.type === 3) {
      return (
        <a
          href={msg.content}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline break-all"
        >
          {msg.content}
        </a>
      );
    }

    return renderTextContent();
  };

  return (
    <div className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-3 py-2 shadow-sm',
          isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm',
        )}
      >
        <div className="text-sm">{renderContent()}</div>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            isMe ? 'text-primary-foreground/70' : 'text-foreground/60',
          )}
        >
          <span>{formatCompactTime(msg.createTime)}</span>
          {isMe && <span className="inline-flex w-4 justify-center">{renderStatusIcon()}</span>}
        </div>
      </div>
    </div>
  );
};

export default memo(MessageItem);
