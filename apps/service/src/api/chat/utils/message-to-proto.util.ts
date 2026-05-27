import { Prisma } from 'generated/prisma/client';
import {
  ConversationInfo,
  FileInfo,
  IConversationInfo,
  IMessageInfo,
  MediaInfo,
} from '@c_chat/shared-protobuf';

export const messageHistoryWithMediaInclude = {
  media: { include: { file: true } },
  user: true,
} satisfies Prisma.MessageHistoryInclude;

export type MessageHistoryWithMedia = Prisma.MessageHistoryGetPayload<{
  include: typeof messageHistoryWithMediaInclude;
}>;

export type ConversationUpdatePayload = Prisma.ConversationGetPayload<{
  include: {
    participants: {
      include: {
        user: true;
      };
    };
  };
}> & {
  lastMsgContent?: string | null;
  lastMsgTime?: Date | null;
  unreadCount?: number;
  lastReadSeq?: bigint;
};

export function buildConversationInfoPayload(
  conversation: ConversationUpdatePayload,
): IConversationInfo {
  const targetUser = conversation.participants.find((participant) => participant.user)?.user;

  return ConversationInfo.create({
    id: conversation.id,
    type: conversation.type,
    targetInfo: targetUser
      ? {
          id: targetUser.id,
          name: targetUser.nickname ?? '',
          avatarUrl: targetUser.avatarUrl ?? '',
        }
      : undefined,
    lastMsgContent: conversation.lastMsgContent ?? undefined,
    lastMsgTime: conversation.lastMsgTime ? conversation.lastMsgTime.getTime() : undefined,
    updateTime: conversation.updateTime.getTime(),
    createTime: conversation.createTime.getTime(),
    unreadCount: conversation.unreadCount ?? 0,
    lastReadSeq: String(conversation.lastReadSeq ?? 0n),
  });
}

export function buildMessageInfoPayload(m: MessageHistoryWithMedia): IMessageInfo {
  const media = m.media;
  const file = media?.file;

  const mediaProto =
    media && file
      ? MediaInfo.create({
          id: media.id,
          type: media.type,
          fileId: media.fileId,
          file: FileInfo.create({
            id: file.id,
            fileName: file.fileName,
            url: file.url,
            mimeType: file.mimeType,
            ext: file.ext ?? undefined,
            size: Number(file.size),
          }),
          fileUrl: media.fileUrl ?? file.url ?? undefined,
          thumbUrl: media.thumbUrl ?? undefined,
          width: media.width ?? undefined,
          height: media.height ?? undefined,
          durationSec: media.duration ?? undefined,
          waveform: media.waveform,
        })
      : undefined;

  return {
    id: m.id,
    seq: String(m.seq),
    senderId: m.senderId,
    senderInfo: {
      id: m.user.id,
      nickname: m.user.nickname ?? undefined,
      avatarUrl: m.user.avatarUrl ?? undefined,
      email: m.user.email ?? undefined,
    },
    conversationId: m.conversationId,
    content: m.content ?? '',
    type: m.type,
    state: 0,
    createTime: m.createTime.getTime(),
    updateTime: m.updateTime.getTime(),
    clientMsgId: m.clientMsgId ?? '',
    mediaGroupId: m.mediaGroupId ?? undefined,
    media: mediaProto,
  };
}
