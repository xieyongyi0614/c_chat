import type { MediaPreviewItem, MediaPreviewPayload } from '@c_chat/shared-types';

export type ImageAction = 'zoom-in' | 'zoom-out' | 'rotate' | 'reset';
export type DownloadStatus = 'idle' | 'saving' | 'saved' | 'canceled' | 'failed';
export type MediaErrorKind = 'empty-source' | 'load-failed' | 'unsupported-format' | 'open-failed';
export type MediaMetaRow = readonly [string, string];
export const VIDEO_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

export const normalizeIndex = (payload: MediaPreviewPayload | null) => {
  if (!payload?.items.length) return 0;
  return Math.max(0, Math.min(payload.initialIndex ?? 0, payload.items.length - 1));
};

export const getMediaName = (item?: MediaPreviewItem | null) => {
  if (!item) return '媒体预览';
  return item.fileName || (item.type === 'video' ? '视频' : '图片');
};

export const formatFileSize = (size?: number) => {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const formatDuration = (duration?: number) => {
  if (!duration) return '-';
  const total = Math.round(duration);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  return `${minutes}:${seconds}`;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const seekMedia = (currentTime: number, duration: number, delta: number) => {
  if (!duration) return currentTime;
  return clamp(currentTime + delta, 0, duration);
};

export const getMediaErrorMessage = (type: MediaPreviewItem['type'], kind: MediaErrorKind) => {
  if (kind === 'empty-source') return `${type === 'video' ? '视频' : '图片'}地址为空`;
  if (kind === 'unsupported-format') return '视频无法播放，可能是不支持的格式';
  if (kind === 'open-failed') return '无法打开原文件';
  return `${type === 'video' ? '视频' : '图片'}加载失败`;
};

export const getDownloadName = (item: MediaPreviewItem) => {
  if (item.fileName) return item.fileName;
  const extension = item.type === 'video' ? 'mp4' : 'jpg';
  return `${item.type}-${Date.now()}.${extension}`;
};

export const getDownloadFilters = (item: MediaPreviewItem) => {
  const fileName = getDownloadName(item);
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension) {
    return [{ name: extension.toUpperCase(), extensions: [extension] }];
  }

  return item.type === 'video'
    ? [{ name: '视频', extensions: ['mp4', 'mov', 'webm'] }]
    : [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }];
};
