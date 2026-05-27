import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database';
import { generatePrivateConversationId } from '../../../utils/chat.util';
import { Prisma } from 'generated/prisma/client';
import { DEFAULT_PAGINATION_PARAMS } from 'src/constants';
import { UsersService } from 'src/api/web/users/users.service';
import { UsersTypes } from 'src/types/api/users-types';
import { ConversationType } from '@c_chat/shared-types';

type ParticipantConversationItem = {
  id: string;
  type: number;
  targetId: string | null;
  conversationName: string | null;
  conversationAvatar: string | null;
  lastMsgContent: string | null;
  lastMsgTime: Date | null;
  updateTime: Date;
  createTime: Date;
  unreadCount: number;
  lastReadSeq: bigint;
};

type ParticipantWithConversation = Prisma.ConversationParticipantGetPayload<{
  include: {
    conversation: true;
  };
}>;

type ConversationTarget = {
  targetId: string | null;
  conversationName: string | null;
  conversationAvatar: string | null;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UsersService,
  ) {}

  private buildGroupDefaultName(users: Pick<UsersTypes.UsersItem, 'id' | 'nickname'>[]) {
    return users
      .slice(0, 4)
      .map((user) => user.nickname || user.id)
      .filter(Boolean)
      .join(', ');
  }

  private getUserConversationName(user?: Pick<UsersTypes.UsersItem, 'id' | 'nickname'>) {
    return user?.nickname || user?.id || '';
  }

  private async getGroupConversation(groupId: string) {
    return this.prisma.conversation.findFirstOrThrow({
      where: {
        type: ConversationType.Group,
        groupId,
      },
    });
  }

  private getLastMessageContent(content: string | null | undefined, type: number) {
    if (content?.trim()) {
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

  private async getConversationTargets(
    userId: string,
    conversations: { id: string; type: number; groupId: string | null }[],
  ) {
    const targetByConversationId = new Map<string, ConversationTarget>();
    const groupIds = conversations
      .map((conversation) => conversation.groupId)
      .filter((groupId): groupId is string => Boolean(groupId));
    const privateConversationIds = conversations
      .filter((conversation) => conversation.type === ConversationType.Single)
      .map((conversation) => conversation.id);

    if (groupIds.length > 0) {
      const groups = await this.prisma.group.findMany({
        where: { id: { in: groupIds } },
        select: { id: true, name: true, avatarUrl: true },
      });
      const groupById = new Map(groups.map((group) => [group.id, group]));
      conversations.forEach((conversation) => {
        if (!conversation.groupId) {
          return;
        }
        const group = groupById.get(conversation.groupId);
        targetByConversationId.set(conversation.id, {
          targetId: conversation.groupId,
          conversationName: group?.name ?? null,
          conversationAvatar: group?.avatarUrl ?? null,
        });
      });
    }

    if (privateConversationIds.length > 0) {
      const participants = await this.prisma.conversationParticipant.findMany({
        where: {
          conversationId: { in: privateConversationIds },
          userId: { not: userId },
        },
        include: {
          user: true,
        },
      });
      participants.forEach((participant) => {
        targetByConversationId.set(participant.conversationId, {
          targetId: participant.userId,
          conversationName: this.getUserConversationName(participant.user),
          conversationAvatar: participant.user.avatarUrl,
        });
      });
    }

    return targetByConversationId;
  }

  private async buildConversationItems(
    userId: string,
    participants: ParticipantWithConversation[],
  ): Promise<ParticipantConversationItem[]> {
    if (participants.length === 0) {
      return [];
    }

    const conversationIds = participants.map((participant) => participant.conversationId);
    const lastMessages = await this.prisma.conversationLastMessage.findMany({
      where: { conversationId: { in: conversationIds } },
    });
    const lastMessageByConversationId = new Map(
      lastMessages.map((message) => [message.conversationId, message]),
    );
    const unreadRows = await this.prisma.messageHistory.groupBy({
      by: ['conversationId'],
      where: {
        senderId: { not: userId },
        OR: participants.map((participant) => ({
          conversationId: participant.conversationId,
          seq: { gt: participant.lastReadSeq },
        })),
      },
      _count: {
        id: true,
      },
    });
    const unreadByConversationId = new Map(
      unreadRows.map((row) => [row.conversationId, row._count.id]),
    );
    const targetByConversationId = await this.getConversationTargets(
      userId,
      participants.map((participant) => participant.conversation),
    );

    return participants.map((participant) => {
      const conversation = participant.conversation;
      const lastMessage = lastMessageByConversationId.get(participant.conversationId);
      const target = targetByConversationId.get(participant.conversationId);

      return {
        id: participant.conversationId,
        type: conversation.type,
        targetId: target?.targetId ?? null,
        conversationName: participant.remark || target?.conversationName || null,
        conversationAvatar: target?.conversationAvatar ?? null,
        lastMsgContent: lastMessage
          ? this.getLastMessageContent(lastMessage.content, lastMessage.type)
          : null,
        lastMsgTime: lastMessage?.time ?? null,
        updateTime: participant.updateTime,
        createTime: participant.createTime,
        unreadCount: unreadByConversationId.get(participant.conversationId) ?? 0,
        lastReadSeq: participant.lastReadSeq,
      };
    });
  }

  async createGroup(
    ownerId: string,
    name: string | undefined,
    memberIds: string[],
    avatarUrl?: string,
  ) {
    const uniqueMemberIds = Array.from(new Set([ownerId, ...(memberIds ?? [])].filter(Boolean)));

    if (uniqueMemberIds.length < 3) {
      throw new Error('创建群聊至少需要 3 个成员');
    }

    const users = await this.userService.getMultipleUsers(uniqueMemberIds);
    if (users.length !== uniqueMemberIds.length) {
      throw new Error('群成员不存在');
    }

    const groupName = name?.trim() || this.buildGroupDefaultName(users) || '群聊';

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: groupName,
          avatarUrl: avatarUrl?.trim() || undefined,
          ownerId,
          members: {
            create: uniqueMemberIds.map((userId) => ({
              userId,
              role: userId === ownerId ? 0 : 2,
              state: 0,
            })),
          },
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.Group,
          groupId: group.id,
        },
      });

      await tx.conversationParticipant.createMany({
        data: uniqueMemberIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
        })),
        skipDuplicates: true,
      });

      return { group, conversation, memberIds: uniqueMemberIds };
    });
  }

  async getGroupDetail(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      select: { state: true },
    });

    if (!member || member.state !== 0) {
      throw new Error('无权查看群聊');
    }

    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        state: 0,
      },
      include: {
        members: {
          where: { state: 0 },
          include: { user: true },
          orderBy: [{ role: 'asc' }, { createTime: 'asc' }],
        },
      },
    });

    if (!group) {
      throw new Error('群聊不存在');
    }

    return group;
  }

  private async assertGroupOwner(groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        state: 0,
      },
    });

    if (!group) {
      throw new Error('群聊不存在');
    }

    if (group.ownerId !== userId) {
      throw new Error('仅群主可操作');
    }

    return group;
  }

  async updateGroup(
    operatorId: string,
    groupId: string,
    data: { name?: string; avatarUrl?: string; notice?: string },
  ) {
    await this.assertGroupOwner(groupId, operatorId);

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl.trim() || null }),
        ...(data.notice !== undefined && { notice: data.notice.trim() || null }),
      },
    });

    const conversation = await this.getGroupConversation(groupId);

    return { group, conversation };
  }

  async inviteGroupMembers(operatorId: string, groupId: string, memberIds: string[]) {
    await this.assertGroupOwner(groupId, operatorId);

    const uniqueMemberIds = Array.from(new Set((memberIds ?? []).filter(Boolean)));
    if (uniqueMemberIds.length === 0) {
      throw new Error('请选择要邀请的成员');
    }

    const users = await this.userService.getMultipleUsers(uniqueMemberIds);
    if (users.length !== uniqueMemberIds.length) {
      throw new Error('群成员不存在');
    }

    const conversation = await this.getGroupConversation(groupId);
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    const lastMessage = await this.prisma.conversationLastMessage.findUnique({
      where: { conversationId: conversation.id },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const userId of uniqueMemberIds) {
        await tx.groupMember.upsert({
          where: {
            groupId_userId: {
              groupId,
              userId,
            },
          },
          update: {
            state: 0,
            role: 2,
          },
          create: {
            groupId,
            userId,
            role: 2,
            state: 0,
          },
        });

        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId,
            },
          },
          update: {
            isDeleted: false,
            lastReadSeq: lastMessage?.seq ?? 0,
          },
          create: {
            conversationId: conversation.id,
            userId,
            lastReadSeq: lastMessage?.seq ?? 0,
          },
        });
      }
    });

    return { group, conversation, memberIds: uniqueMemberIds };
  }

  async leaveGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        state: 0,
      },
    });

    if (!group) {
      throw new Error('群聊不存在');
    }

    if (group.ownerId === userId) {
      throw new Error('群主请直接解散群聊');
    }

    const conversation = await this.getGroupConversation(groupId);

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        data: {
          state: -1,
        },
      });

      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId,
          },
        },
        data: {
          isDeleted: true,
        },
      });
    });

    return { group, conversation };
  }

  async dismissGroup(operatorId: string, groupId: string) {
    await this.assertGroupOwner(groupId, operatorId);

    const conversation = await this.getGroupConversation(groupId);

    const group = await this.prisma.$transaction(async (tx) => {
      const updatedGroup = await tx.group.update({
        where: { id: groupId },
        data: { state: -1 },
      });

      await tx.groupMember.updateMany({
        where: { groupId },
        data: { state: -1 },
      });

      await tx.conversationParticipant.updateMany({
        where: { conversationId: conversation.id },
        data: { isDeleted: true },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { state: -1 },
      });

      return updatedGroup;
    });

    return { group, conversation };
  }

  async assertCanSendMessage(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      include: {
        conversation: true,
      },
    });

    if (!participant || participant.isDeleted || !participant.conversation) {
      throw new Error('无权发送消息');
    }

    if (participant.conversation.state !== 0) {
      throw new Error('会话不可发送消息');
    }

    if (participant.conversation.type !== ConversationType.Group) {
      return participant.conversation;
    }

    const groupId = participant.conversation.groupId;
    if (!groupId) {
      throw new Error('群聊不存在');
    }

    const groupMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      include: {
        group: true,
      },
    });

    if (!groupMember || groupMember.state !== 0 || groupMember.group.state !== 0) {
      throw new Error('无权发送群消息');
    }

    return participant.conversation;
  }

  /**
   * 获取或创建私聊会话
   */
  async createOrGetPrivateConversation(senderId: string, targetId: string) {
    const conversationId = generatePrivateConversationId(senderId, targetId);
    const users = await this.userService.getMultipleUsers([senderId, targetId]);
    const map = new Map(users.map((u) => [u.id, u]));

    const userA = map.get(senderId);
    const userB = map.get(targetId);
    if (!userA || !userB) {
      throw new Error('用户不存在');
    }

    try {
      const res = await this.prisma.conversation.create({
        data: {
          id: conversationId,
          type: ConversationType.Single,
          participants: {
            create: [
              {
                userId: senderId,
              },
              {
                userId: targetId,
              },
            ],
          },
        },
        include: {
          participants: true,
        },
      });

      return { ...res, isNew: true };
    } catch (e) {
      this.logger.debug(`getOrCreatePrivateConversation: ${(e as Error).message}`);
      const r = await this.prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        include: { participants: true },
      });
      return { ...r, isNew: false };
    }
  }

  /**
   * 获取或创建群聊会话
   */
  async getOrCreateGroupConversation(targetId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.Group,
        groupId: targetId,
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.$transaction(async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: targetId },
          include: { members: { where: { state: 0 } } },
        });

        if (!group) {
          throw new Error('群组不存在');
        }

        const newConversation = await tx.conversation.create({
          data: {
            type: ConversationType.Group,
            groupId: group.id,
          },
        });

        if (group.members.length > 0) {
          await tx.conversationParticipant.createMany({
            data: group.members.map((m) => ({
              conversationId: newConversation.id,
              userId: m.userId,
            })),
            skipDuplicates: true,
          });
        }

        return {
          ...newConversation,
          participants: [],
        };
      });
    }

    return conversation;
  }

  /**
   * 获取会话详情
   */
  async getConversationById(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });
  }

  async getConversationUpdateById(id: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: id,
        isDeleted: false,
      },
      include: {
        conversation: true,
      },
    });

    return this.buildConversationItems('', participants);
  }

  /**
   * 获取用户会话列表（支持增量同步）
   */
  async getUserConversations(
    userId: string,
    page: number = DEFAULT_PAGINATION_PARAMS.page,
    pageSize: number = DEFAULT_PAGINATION_PARAMS.pageSize,
    lastUpdateTime?: Date,
  ): Promise<{
    list: ParticipantConversationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConversationParticipantWhereInput = {
      userId,
      isDeleted: false,
      conversation: {
        state: 0,
      },
    };

    if (lastUpdateTime) {
      where.updateTime = {
        gt: lastUpdateTime,
      };
    }

    const [participants, total] = await Promise.all([
      this.prisma.conversationParticipant.findMany({
        where,
        include: {
          conversation: true,
        },
        orderBy: [{ isTop: 'desc' }, { updateTime: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.conversationParticipant.count({ where }),
    ]);

    const list = await this.buildConversationItems(userId, participants);
    list.sort((a, b) => {
      if (a.lastMsgTime && b.lastMsgTime) {
        return b.lastMsgTime.getTime() - a.lastMsgTime.getTime();
      }
      if (a.lastMsgTime) {
        return -1;
      }
      if (b.lastMsgTime) {
        return 1;
      }
      return b.updateTime.getTime() - a.updateTime.getTime();
    });

    return { list, total, page, pageSize };
  }

  /**
   * 获取用户参与的所有会话 ID
   */
  async getUserConversationIds(userId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        userId: userId,
        isDeleted: false,
        conversation: {
          state: 0,
        },
      },
      select: {
        conversationId: true,
      },
    });
    return participants.map((p) => p.conversationId);
  }
}
