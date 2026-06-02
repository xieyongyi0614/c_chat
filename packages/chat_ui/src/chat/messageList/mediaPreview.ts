import { MESSAGE_TYPE } from '@c_chat/shared-config';
import type { MediaPreviewItem } from '@c_chat/shared-types';
import type { ChatMessageListItem } from './types';

const getSortValue = (message: ChatMessageListItem): bigint => {
  const value = 'seq' in message ? message.seq : undefined;
  return typeof value === 'bigint' && value > BigInt(0) ? value : BigInt(message.createTime);
};

export const toChatMediaPreviewItem = (message: ChatMessageListItem): MediaPreviewItem | null => {
  if (message.type !== MESSAGE_TYPE.Image && message.type !== MESSAGE_TYPE.Video) {
    return null;
  }

  return {
    id: message.id,
    type: message.type === MESSAGE_TYPE.Video ? 'video' : 'image',
    fileUrl: message.fileUrl || (message.type === MESSAGE_TYPE.Video ? message.content : undefined),
    filePath: message.filePath,
    mimeType: message.mimeType,
    fileName: message.fileName,
    fileSize: message.fileSize,
    duration: message.duration,
    createTime: message.createTime,
    senderId: message.senderId,
  };
};

export const buildChatMediaPreviewItems = (
  msgMap: Record<string, ChatMessageListItem[]>,
  conversationId?: string,
) =>
  Object.values(msgMap)
    .flat()
    .filter((message) => !conversationId || message.conversationId === conversationId)
    .sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);
      return av === bv ? 0 : av > bv ? 1 : -1;
    })
    .map(toChatMediaPreviewItem)
    .filter((item): item is MediaPreviewItem => Boolean(item));
