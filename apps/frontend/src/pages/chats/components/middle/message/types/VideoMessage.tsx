import { memo } from 'react';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { formatCompactTime } from '@c_chat/shared-utils';
import { ipc } from '@c_chat/shared-utils';
import { cn } from '@c_chat/ui';
import { useMessageStore } from '@c_chat/frontend/stores';
import { Play } from 'lucide-react';
import { buildConversationPreviewItems, toMediaPreviewItem } from '../mediaPreviewItems';

interface VideoMessageProps {
  msg: LocalMessageListItem;
  isMe: boolean;
  isRead: boolean;
}

const VideoMessage = ({ msg, isMe, isRead }: VideoMessageProps) => {
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

  const isUploading = msg.status === MessageStatusEnum.uploading;
  const isSending = msg.status === MessageStatusEnum.sending;
  const isFailed = msg.status === MessageStatusEnum.fail;
  const showOverlay = isUploading || isSending || isFailed;
  const openPreview = () => {
    const previewItems = buildConversationPreviewItems(
      useMessageStore.getState().msgMap,
      msg.conversationId,
    );
    const fallbackItem = toMediaPreviewItem(msg);
    const items = previewItems.length ? previewItems : fallbackItem ? [fallbackItem] : [];
    const initialIndex = Math.max(
      0,
      items.findIndex((item) => item.id === msg.id),
    );

    void ipc.OpenMediaPreview({
      items,
      initialIndex,
      conversationId: msg.conversationId,
      messageId: msg.id,
    });
  };

  return (
    <div className="relative inline-block">
      <div className="relative rounded-lg overflow-hidden bg-black/10 dark:bg-black/30 w-48 h-28">
        {/* 视频缩略图或黑色背景 */}
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          {/* 如果有fileUrl可以作为缩略图 */}
          {msg.fileUrl && (
            <img
              src={`http://localhost:3001${msg.fileUrl}`}
              alt="视频缩略图"
              className={cn('w-full h-full object-cover', showOverlay && 'opacity-60')}
            />
          )}
        </div>

        {/* 播放按钮 - 中央 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
            onClick={openPreview}
          >
            <Play className="w-6 h-6 text-white fill-white" />
          </button>
        </div>

        {/* 时间和状态 - 右下角 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5 backdrop-blur-sm">
          <span className="text-white text-[10px]">{formatCompactTime(msg.createTime)}</span>
          {isMe && (
            <span className="inline-flex w-3 justify-center text-white">{getStatusIcon()}</span>
          )}
        </div>

        {/* 上传进度覆盖层 */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="w-1/2 bg-white/40 rounded-full h-1 mb-1">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${msg.progress || 0}%` }}
              />
            </div>
            <span className="text-white text-[9px]">{msg.progress || 0}%</span>
          </div>
        )}

        {/* 发送中覆盖层 */}
        {isSending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}

        {/* 失败覆盖层 */}
        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white text-xs">上传失败</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(VideoMessage);
