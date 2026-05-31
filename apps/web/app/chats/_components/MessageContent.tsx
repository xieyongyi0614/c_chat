'use client';

import { FileText, Play } from 'lucide-react';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import type { LocalMessageListItem } from '@c_chat/shared-types';

interface MessageContentProps {
  message: LocalMessageListItem;
}

const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDuration = (seconds: number): string => {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

export function MessageContent({ message }: MessageContentProps) {
  // 图片上传归属 06，文件上传归属 06，视频预览归属 08，语音录制/播放归属 07；此处仅只读展示
  switch (message.type) {
    case MESSAGE_TYPE.Image:
      return (
        <img
          src={message.fileUrl}
          alt={message.fileName || '图片'}
          className="max-h-60 max-w-full rounded-md object-cover"
        />
      );

    case MESSAGE_TYPE.Video:
      return (
        <div className="flex aspect-video w-56 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Play className="size-8" />
        </div>
      );

    case MESSAGE_TYPE.Audio:
      return (
        <div className="flex items-center gap-2 text-sm">
          <Play className="size-4" />
          <span>{formatDuration(message.duration ?? 0)}</span>
        </div>
      );

    case MESSAGE_TYPE.File:
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{message.fileName || '文件'}</span>
            {message.fileSize ? (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(message.fileSize)}
              </span>
            ) : null}
          </div>
        </div>
      );

    default:
      return <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>;
  }
}
