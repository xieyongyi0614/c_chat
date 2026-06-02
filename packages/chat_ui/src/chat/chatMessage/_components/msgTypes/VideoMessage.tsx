import { memo } from 'react';
import { Play } from 'lucide-react';
import { MessageStatus } from '@c_chat/shared-types';
import { cn } from '../../../../lib/utils';
import MessageDate from './MessageDate';
import type { VideoMessageProps } from './types';

function VideoMessage({
  message,
  isMe,
  isRead,
  onRetry,
  retrying,
  fileResolver,
  onOpenPreview,
}: VideoMessageProps) {
  const isUploading = message.status === MessageStatus.uploading;
  const isSending = message.status === MessageStatus.sending;
  const isFailed = message.status === MessageStatus.fail;
  const showOverlay = isUploading || isSending || isFailed;
  const videoSrc = message.fileUrl
    ? fileResolver.formatFileUrl(message.fileUrl)
    : message.content
      ? fileResolver.formatFileUrl(message.content)
      : '';

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
          <div className="flex h-full w-full items-center justify-center bg-muted" />
        )}

        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm transition-colors hover:bg-background/30"
            onClick={onOpenPreview}
          >
            <Play className="size-6 fill-primary-foreground text-primary-foreground" />
          </button>
        </div>

        <div className="pointer-events-auto absolute bottom-1 right-1 z-30 flex rounded-full bg-foreground/55 px-1.5 py-0.5 text-background backdrop-blur-sm [&_span]:text-background">
          <MessageDate
            time={message.createTime}
            status={message.status}
            isMe={isMe}
            isRead={isRead}
            onRetry={onRetry}
            retrying={retrying}
            className="float-none ml-0 text-[11px]"
          />
        </div>

        {isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-foreground/40">
            <div className="mb-1 h-1 w-1/2 rounded-full bg-background/40">
              <div
                className="h-full rounded-full bg-background transition-all duration-300"
                style={{ width: `${message.progress || 0}%` }}
              />
            </div>
            <span className="text-[9px] text-background">{message.progress || 0}%</span>
          </div>
        )}

        {isSending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/30">
            <div className="size-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
          </div>
        )}

        {isFailed && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-foreground/50">
            <span className="text-xs text-background">上传失败</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VideoMessage);
