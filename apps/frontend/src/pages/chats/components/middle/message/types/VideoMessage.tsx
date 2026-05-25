import { memo } from 'react';
import { MessageStatus, type LocalMessageListItem } from '@c_chat/shared-types';
import { ipc } from '@c_chat/shared-utils';
import { cn } from '@c_chat/ui';
import { useMessageStore } from '@c_chat/frontend/stores';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import { Play } from 'lucide-react';
import { buildConversationPreviewItems, toMediaPreviewItem } from '../mediaPreviewItems';
import MessageDate from '../MessageDate';

interface VideoMessageProps {
  msg: LocalMessageListItem;
  isMe: boolean;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

const VideoMessage = ({ msg, isMe, isRead, onRetry, retrying }: VideoMessageProps) => {
  const isUploading = msg.status === MessageStatus.uploading;
  const isSending = msg.status === MessageStatus.sending;
  const isFailed = msg.status === MessageStatus.fail;
  const showOverlay = isUploading || isSending || isFailed;
  const videoSrc = msg.fileUrl
    ? formatFileUrl(msg.fileUrl)
    : msg.content
      ? formatFileUrl(msg.content)
      : '';
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
      <div className="relative h-28 w-48 overflow-hidden rounded-xl bg-transparent">
        {videoSrc ? (
          <video
            src={videoSrc}
            className={cn('h-full w-full object-cover', showOverlay && 'opacity-60')}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-900" />
        )}

        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <button
            type="button"
            className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
            onClick={openPreview}
          >
            <Play className="w-6 h-6 text-white fill-white" />
          </button>
        </div>

        <div className="pointer-events-auto absolute bottom-1 right-1 z-30 flex rounded-full bg-black/55 px-1.5 py-0.5 text-white backdrop-blur-sm [&_span]:text-white">
          <MessageDate
            time={msg.createTime}
            status={msg.status}
            isMe={isMe}
            isRead={isRead}
            onRetry={onRetry}
            retrying={retrying}
            className="float-none ml-0 text-[11px]"
          />
        </div>

        {isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40">
            <div className="w-1/2 bg-white/40 rounded-full h-1 mb-1">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${msg.progress || 0}%` }}
              />
            </div>
            <span className="text-white text-[9px]">{msg.progress || 0}%</span>
          </div>
        )}

        {isSending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}

        {isFailed && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <span className="text-white text-xs">上传失败</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(VideoMessage);
