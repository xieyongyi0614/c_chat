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

  private async allocateSeq(tx: Prisma.TransactionClient, conversationId: string): Promise<number> {
    await tx.$executeRaw`
      UPDATE conversation
      SET lastSeq = LAST_INSERT_ID(lastSeq + 1)
      WHERE id = ${conversationId}
    `;

    const [row] = await tx.$queryRaw<{ seq: number }[]>`
      SELECT LAST_INSERT_ID() AS seq
    `;

    return row.seq;
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
    if (clientMsgId) {
      const existing = await this.prisma.messageHistory.findUnique({
        where: {
          conversationId_clientMsgId_senderId: {
            conversationId,
            clientMsgId,
            senderId,
          },
        },
        include: messageHistoryWithMediaInclude,
      });

      if (existing) {
        return existing;
      }
    }

    const [file, sender] = await Promise.all([
      fileId
        ? this.prisma.file.findUnique({ where: { id: fileId }, select: { id: true, url: true } })
        : Promise.resolve(null),
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: { nickname: true, avatarUrl: true },
      }),
    ]);

    if (fileId && !file) {
      throw new Error('文件不存在');
    }

    const lastMsgContent = this.generateLastMsgContent(content ?? null, msgType);
    const lastMessageSnapshot = {
      content: lastMsgContent,
      type: msgType,
      senderId,
      senderName: sender?.nickname,
      senderAvatar: sender?.avatarUrl,
    };

    return this.prisma.$transaction(async (tx): Promise<MessageHistoryWithMedia> => {
      let mediaId: string | undefined;
      if (file) {
        const media = await tx.media.create({
          data: {
            type: msgType,
            fileId: file.id,
            fileUrl: file.url,
            thumbUrl: thumbUrl ?? undefined,
            duration: durationSec != null && durationSec > 0 ? durationSec : undefined,
            waveform,
          },
        });
        mediaId = media.id;
      }

      const seq = await this.allocateSeq(tx, conversationId);
      const created = await tx.messageHistory.create({
        data: {
          senderId,
          conversationId,
          seq,
          content,
          type: msgType,
          clientMsgId,
          mediaId,
          mediaGroupId,
        },
        include: messageHistoryWithMediaInclude,
      });

      await Promise.all([
        tx.conversationLastMessage.upsert({
          where: { conversationId },
          create: {
            conversationId,
            seq,
            ...lastMessageSnapshot,
            time: created.createTime,
          },
          update: {
            seq,
            ...lastMessageSnapshot,
            time: created.createTime,
          },
        }),
        tx.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId: senderId } },
          data: { lastReadSeq: seq, updateTime: created.createTime },
        }),
      ]);

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
        },
        orderBy: {
          seq: 'desc',
        },
        include: messageHistoryWithMediaInclude,
        skip,
        take: safePageSize,
      }),
      this.prisma.messageHistory.count({
        where: {
          conversationId,
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
      },
      orderBy: {
        seq: 'desc',
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
          seq: {
            lt: params.beforeMsgId,
          },
        },
        orderBy: {
          seq: 'desc',
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
          seq: {
            gt: params.afterMsgId,
          },
        },
        orderBy: {
          seq: 'asc',
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

  async markConversationAsRead(userId: string, conversationId: string, msgSeq?: string) {
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

    let targetSeq = BigInt(0);

    if (msgSeq) {
      const parsedSeq = Number(msgSeq);

      if (!Number.isNaN(parsedSeq)) {
        const target = await this.prisma.messageHistory.findFirst({
          where: {
            conversationId,
            seq: parsedSeq,
          },
          select: { seq: true },
        });
        targetSeq = target?.seq ?? BigInt(0);
      } else {
        const target = await this.prisma.messageHistory.findFirst({
          where: {
            id: msgSeq,
            conversationId,
          },
          select: { seq: true },
        });
        targetSeq = target?.seq ?? BigInt(0);
      }

      if (targetSeq < BigInt(0)) {
        throw new Error('消息不存在');
      }
    } else {
      const target = await this.prisma.messageHistory.findFirst({
        where: {
          conversationId,
        },
        orderBy: {
          seq: 'desc',
        },
        select: {
          seq: true,
        },
      });
      targetSeq = target?.seq ?? BigInt(0);
    }

    const unreadCount =
      targetSeq >= BigInt(0)
        ? await this.prisma.messageHistory.count({
            where: {
              conversationId,
              senderId: { not: userId },
              seq: {
                gt: targetSeq,
              },
            },
          })
        : 0;

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadSeq: targetSeq,
      },
    });

    return {
      conversationId,
      msgSeq: String(targetSeq),
      unreadCount,
    };
  }
}
