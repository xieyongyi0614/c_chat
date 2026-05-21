import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database';
import { Prisma } from 'generated/prisma/client';
import {
  messageHistoryWithMediaInclude,
  MessageHistoryWithMedia,
} from '../utils/message-to-proto.util';
import { SendMessageRequest } from '@c_chat/shared-protobuf';

const MESSAGE_HISTORY_PAGE_SIZE = 20;

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private prisma: PrismaService) {}

  private normalizeMessageLimit(limit: number = MESSAGE_HISTORY_PAGE_SIZE) {
    return Math.max(1, Math.min(limit, MESSAGE_HISTORY_PAGE_SIZE));
  }

  async getNextMsgId(tx: Prisma.TransactionClient, conversationId: string) {
    const seq = await tx.conversationSequence.upsert({
      where: { conversationId },
      update: { lastMsgId: { increment: 1 } },
      create: { conversationId, lastMsgId: 1 },
    });
    return seq.lastMsgId;
  }

  /**
   * 根据消息类型生成会话列表显示的内容
   * 0:文本, 1:图片, 2:视频, 3:文件, 4:音频
   */
  private generateLastMsgContent(content: string | null, type: number): string {
    if (content && content.trim()) {
      return content;
    }

    const typeMap: Record<number, string> = {
      0: '',
      1: '[图片]',
      2: '[视频]',
      3: '[文件]',
      4: '[音频]',
    };
    return typeMap[type] || '[消息]';
  }

  /**
   * 创建并发送消息（媒体走 MessageHistory -> Media -> File）
   */
  async sendMessage(
    data: {
      senderId: string;
    } & Omit<SendMessageRequest, 'toJSON'>,
  ): Promise<MessageHistoryWithMedia> {
    const {
      senderId,
      conversationId,
      content,
      type,
      clientMsgId,
      fileId,
      mediaGroupId,
      durationSec,
      waveform,
      thumbUrl,
    } = data;

    const msgType = type ?? 0;

    return this.prisma.$transaction(async (tx): Promise<MessageHistoryWithMedia> => {
      const existing = await tx.messageHistory.findFirst({
        where: { conversationId, clientMsgId, senderId },
      });

      if (existing) {
        return tx.messageHistory.findFirstOrThrow({
          where: { id: existing.id },
          include: messageHistoryWithMediaInclude,
        });
      }

      let mediaId: string | undefined;
      if (fileId) {
        const file = await tx.file.findFirst({ where: { id: fileId } });
        if (!file) {
          throw new Error('文件不存在');
        }

        const data = {
          type: msgType,
          fileId: file.id,
          fileUrl: file.url,
          thumbUrl: thumbUrl ?? undefined,
          duration: durationSec != null && durationSec > 0 ? durationSec : undefined,
          waveform,
        };
        const media = await tx.media.create({ data });
        mediaId = media.id;
      }

      const msgId = await this.getNextMsgId(tx, conversationId);
      const created = await tx.messageHistory.create({
        data: {
          senderId,
          conversationId,
          msgId,
          content,
          type: msgType,
          clientMsgId,
          mediaId,
          mediaGroupId,
        },
        include: messageHistoryWithMediaInclude,
      });

      const lastMsgContent = this.generateLastMsgContent(content ?? null, msgType);
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMsgContent, lastMsgTime: created.createTime },
      });

      return created;
    });
  }

  /**
   * 获取会话消息历史
   */
  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    pageSize: number = MESSAGE_HISTORY_PAGE_SIZE,
  ) {
    const safePage = Math.max(1, page);
    const safePageSize = this.normalizeMessageLimit(pageSize);
    const skip = (safePage - 1) * safePageSize;
    const [messages, total] = await Promise.all([
      this.prisma.messageHistory.findMany({
        where: {
          conversationId: conversationId,
          state: 0,
        },
        orderBy: {
          msgId: 'desc',
        },
        include: messageHistoryWithMediaInclude,
        skip,
        take: safePageSize,
      }),
      this.prisma.messageHistory.count({
        where: {
          conversationId,
          state: 0,
        },
      }),
    ]);

    return {
      list: messages.reverse(),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async getLatestConversationMessages(
    conversationId: string,
    limit: number = MESSAGE_HISTORY_PAGE_SIZE,
  ) {
    const safeLimit = this.normalizeMessageLimit(limit);
    const messages = await this.prisma.messageHistory.findMany({
      where: {
        conversationId,
        state: 0,
      },
      orderBy: {
        msgId: 'desc',
      },
      include: messageHistoryWithMediaInclude,
      take: safeLimit,
    });

    return {
      list: messages.reverse(),
      total: messages.length,
      page: 1,
      pageSize: safeLimit,
    };
  }

  async getConversationMessagesByMsgIdRange(
    conversationId: string,
    params: {
      afterMsgId?: number;
      beforeMsgId?: number;
      limit?: number;
    },
  ) {
    const limit = this.normalizeMessageLimit(params.limit ?? MESSAGE_HISTORY_PAGE_SIZE);

    if (params.beforeMsgId != null && params.beforeMsgId > 0) {
      const messages = await this.prisma.messageHistory.findMany({
        where: {
          conversationId,
          state: 0,
          msgId: {
            lt: params.beforeMsgId,
          },
        },
        orderBy: {
          msgId: 'desc',
        },
        include: messageHistoryWithMediaInclude,
        take: limit,
      });

      return {
        list: messages.reverse(),
        total: messages.length,
        page: 1,
        pageSize: limit,
      };
    }

    if (params.afterMsgId != null && params.afterMsgId > 0) {
      const messages = await this.prisma.messageHistory.findMany({
        where: {
          conversationId,
          state: 0,
          msgId: {
            gt: params.afterMsgId,
          },
        },
        orderBy: {
          msgId: 'asc',
        },
        include: messageHistoryWithMediaInclude,
        take: limit,
      });

      return {
        list: messages,
        total: messages.length,
        page: 1,
        pageSize: limit,
      };
    }

    return this.getLatestConversationMessages(conversationId, limit);
  }

  async markConversationAsRead(userId: string, conversationId: string, messageId?: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: {
        id: true,
        isDeleted: true,
      },
    });

    if (!participant || participant.isDeleted) {
      throw new Error('会话不存在或无权限');
    }

    let targetMsgId = -1;

    if (messageId) {
      const parsedMsgId = Number(messageId);

      // 兼容：如果客户端仍传的是 MessageHistory.id（cuid），先查出对应 msgId
      if (!Number.isNaN(parsedMsgId)) {
        const target = await this.prisma.messageHistory.findFirst({
          where: {
            conversationId,
            msgId: parsedMsgId,
            state: 0,
          },
          select: { msgId: true },
        });
        targetMsgId = target?.msgId ?? -1;
      } else {
        const target = await this.prisma.messageHistory.findFirst({
          where: {
            id: messageId,
            conversationId,
            state: 0,
          },
          select: { msgId: true },
        });
        targetMsgId = target?.msgId ?? -1;
      }

      if (targetMsgId < 0) {
        throw new Error('消息不存在');
      }
    } else {
      const target = await this.prisma.messageHistory.findFirst({
        where: {
          conversationId,
          state: 0,
        },
        orderBy: {
          msgId: 'desc',
        },
        select: {
          msgId: true,
        },
      });
      targetMsgId = target?.msgId ?? -1;
    }

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: targetMsgId,
      },
    });

    const unreadCount =
      targetMsgId >= 0
        ? await this.prisma.messageHistory.count({
            where: {
              conversationId,
              state: 0,
              senderId: { not: userId },
              msgId: {
                gt: targetMsgId,
              },
            },
          })
        : 0;

    return {
      conversationId,
      messageId: String(targetMsgId),
      unreadCount,
    };
  }
}
