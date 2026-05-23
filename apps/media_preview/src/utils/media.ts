import { bufferToPreviewUrl, ipc } from '@c_chat/shared-utils';
import type { MediaPreviewItem } from '@c_chat/shared-types';

export const formatMediaUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `http://localhost:3001${url}`;
};

export async function resolveMediaUrl(item: MediaPreviewItem) {
  if (item.url) return formatMediaUrl(item.url);
  if (item.fileUrl) return formatMediaUrl(item.fileUrl);
  if (!item.filePath) return '';

  const buffer = await ipc.ReadLocalFile({ path: item.filePath });
  return bufferToPreviewUrl({
    buffer,
    type: item.mimeType || (item.type === 'video' ? 'video/*' : 'image/*'),
  });
}

export const revokeObjectUrl = (url?: string) => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};
