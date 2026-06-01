import { MESSAGE_TYPE } from '@c_chat/shared-config';
import type { LocalMessageListItem, MediaPreviewItem } from '@c_chat/shared-types';
import { formatFileUrl } from './formatFileUrl';

export const toPreviewItem = (message: LocalMessageListItem): MediaPreviewItem | null => {
  if (message.type === MESSAGE_TYPE.Image) {
    return {
      id: message.id,
      type: 'image',
      fileUrl: formatFileUrl(message.fileUrl),
      mimeType: message.mimeType,
      fileName: message.fileName,
      fileSize: message.fileSize,
      createTime: message.createTime,
      senderId: message.senderId,
    };
  }

  if (message.type === MESSAGE_TYPE.Video) {
    return {
      id: message.id,
      type: 'video',
      fileUrl: formatFileUrl(message.fileUrl || message.content),
      mimeType: message.mimeType,
      fileName: message.fileName,
      fileSize: message.fileSize,
      duration: message.duration,
      createTime: message.createTime,
      senderId: message.senderId,
    };
  }

  return null;
};

export const buildConversationPreviewItems = (
  messages: LocalMessageListItem[],
  conversationId: string,
): MediaPreviewItem[] =>
  messages
    .filter(
      (message) =>
        message.conversationId === conversationId &&
        (message.type === MESSAGE_TYPE.Image || message.type === MESSAGE_TYPE.Video),
    )
    .map(toPreviewItem)
    .filter((item): item is MediaPreviewItem => item !== null);
