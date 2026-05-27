import { MESSAGE_TYPE } from '@c_chat/shared-config';
import type { LocalMessageListItem, MediaPreviewItem } from '@c_chat/shared-types';

const getSortValue = (msg: LocalMessageListItem): bigint =>
  msg.seq > 0n ? msg.seq : BigInt(msg.createTime ?? msg.localTime ?? 0);

export const toMediaPreviewItem = (msg: LocalMessageListItem): MediaPreviewItem | null => {
  if (msg.type !== MESSAGE_TYPE.Image && msg.type !== MESSAGE_TYPE.Video) {
    return null;
  }

  return {
    id: msg.id,
    type: msg.type === MESSAGE_TYPE.Video ? 'video' : 'image',
    fileUrl: msg.fileUrl || (msg.type === MESSAGE_TYPE.Video ? msg.content : undefined),
    filePath: msg.filePath,
    mimeType: msg.mimeType,
    fileName: msg.fileName,
    fileSize: msg.fileSize,
    duration: msg.duration,
    createTime: msg.createTime,
    senderId: msg.senderId,
  };
};

export const buildConversationPreviewItems = (
  msgMap: Record<string, LocalMessageListItem[]>,
  conversationId?: string,
) =>
  Object.values(msgMap)
    .flat()
    .filter((msg) => !conversationId || msg.conversationId === conversationId)
    .sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);
      return av === bv ? 0 : av > bv ? 1 : -1;
    })
    .map(toMediaPreviewItem)
    .filter((item): item is MediaPreviewItem => Boolean(item));
