import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database';
import { generatePrivateConversationId } from '../../../utils/chat.util';
import { Conversation, Group, Prisma } from 'generated/prisma/client';
import { DEFAULT_PAGINATION_PARAMS } from 'src/constants';
import { UsersService } from 'src/api/web/users/users.service';
import { UsersTypes } from 'src/types/api/users-types';

type ConversationTargetUser = Pick<UsersTypes.UsersItem, 'id' | 'nickname' | 'avatarUrl'>;
type ConversationTargetGroup = Pick<Group, 'id' | 'name' | 'avatarUrl' | 'notice' | 'ownerId'>;
type UserConversationItem = Conversation & {
  group?: ConversationTargetGroup;
  user?: ConversationTargetUser | null;
  unreadCount: number;
  lastReadMessageId: number;
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
          type: 2,
          targetId: group.id,
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

    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: { type: 2, targetId: groupId },
    });

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

    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: { type: 2, targetId: groupId },
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
          },
          create: {
            conversationId: conversation.id,
            userId,
          },
        });
      }
    });

    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });

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

    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: { type: 2, targetId: groupId },
    });

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

    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: { type: 2, targetId: groupId },
    });

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

    if (participant.conversation.type !== 2) {
      return participant.conversation;
    }

    const groupId = participant.conversation.targetId;
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
  async getOrCreatePrivateConversation(userIdA: string, userIdB: string) {
    const conversationId = generatePrivateConversationId(userIdA, userIdB);
    let isNew = false;

    // 1. 查找会话
    let conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    // 2. 如果不存在，创建
    if (!conversation) {
      isNew = true;
      conversation = await this.prisma.$transaction(async (tx) => {
        // 创建会话
        const newConversation = await tx.conversation.create({
          data: {
            id: conversationId,
            type: 1, // 私聊
            // targetId: userIdB, // 这里存对方 ID
          },
        });

        // 创建参与者 (A 和 B)
        await tx.conversationParticipant.createMany({
          data: [
            { conversationId: conversationId, userId: userIdA },
            { conversationId: conversationId, userId: userIdB },
          ],
        });

        return {
          ...newConversation,
          participants: [], // 这里可以根据需要填充
        };
      });
    }

    return { ...conversation, isNew };
  }

  /**
   * 获取或创建群聊会话
   */
  async getOrCreateGroupConversation(targetId: string) {
    // 1. 查找会话
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        type: 2, // 群聊
        targetId: targetId,
      },
      include: {
        participants: true,
      },
    });

    // 2. 如果不存在，创建
    if (!conversation) {
      conversation = await this.prisma.$transaction(async (tx) => {
        // 校验群组是否存在
        const group = await tx.group.findUnique({
          where: { id: targetId },
          include: { members: { where: { state: 0 } } },
        });

        if (!group) {
          throw new Error('群组不存在');
        }

        // 创建会话
        const newConversation = await tx.conversation.create({
          data: {
            type: 2, // 群聊
            targetId: targetId,
          },
        });

        // 为当前所有群成员创建会话关联
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
        user: true,
      },
    });

    return participants.map((participant) => ({
      ...participant.conversation,
      participants: participants
        .filter((item) => item.userId !== participant.userId)
        .map((item) => ({
          ...item,
          user: item.user,
        })),
      unreadCount: participant.unreadCount ?? 0,
      lastReadMessageId: participant.lastReadMessageId,
    }));
  }

  /**
   * 获取用户会话列表（支持增量同步）
   */
  async getUserConversations(
    userId: string,
    page: number = DEFAULT_PAGINATION_PARAMS.page,
    pageSize: number = DEFAULT_PAGINATION_PARAMS.pageSize,
    lastUpdateTime?: Date,
  ): Promise<{ list: UserConversationItem[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConversationParticipantWhereInput = {
      userId: userId,
      isDeleted: false,
    };

    if (lastUpdateTime) {
      where.conversation = {
        updateTime: {
          gt: lastUpdateTime,
        },
      };
    }

    const [participants, total] = await Promise.all([
      this.prisma.conversationParticipant.findMany({
        where,
        include: { conversation: true },
        orderBy: [
          { conversation: { lastMsgTime: 'desc' } },
          { conversation: { updateTime: 'desc' } },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.conversationParticipant.count({ where }),
    ]);

    if (participants.length === 0) {
      return { list: [], total, page, pageSize };
    }

    // 🚀 1️⃣ 批量查所有会话的参与者（一次查询）
    const conversationIds = participants.map((p) => p.conversationId);

    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: { in: conversationIds },
      },
      select: {
        conversationId: true,
        userId: true,
      },
    });

    // 🚀 2️⃣ 内存分组：conversationId -> userIds[]
    const conversationParticipantsMap = new Map<string, string[]>();

    for (const p of allParticipants) {
      if (!conversationParticipantsMap.has(p.conversationId)) {
        conversationParticipantsMap.set(p.conversationId, []);
      }
      conversationParticipantsMap.get(p.conversationId)!.push(p.userId);
    }

    // 🚀 3️⃣ 收集所有需要的 userId（一次查用户）
    const allUserIds = new Set<string>();
    const groupIds = new Set<string>();

    for (const participant of participants) {
      if (participant.conversation.type === 1) {
        const userIds = conversationParticipantsMap.get(participant.conversationId) || [];
        userIds.forEach((id) => {
          if (id !== userId) {
            allUserIds.add(id);
          }
        });
      } else if (participant.conversation.type === 2 && participant.conversation.targetId) {
        groupIds.add(participant.conversation.targetId);
      }
    }

    // 🚀 4️⃣ 批量查用户
    const usersMap = new Map<string, ConversationTargetUser>();

    if (allUserIds.size > 0) {
      const users = await this.userService.getMultipleUsers(Array.from(allUserIds));
      users.forEach((user) => {
        usersMap.set(user.id, user);
      });
    }

    const groupsMap = new Map<string, ConversationTargetGroup>();

    if (groupIds.size > 0) {
      const groups = await this.prisma.group.findMany({
        where: {
          id: { in: Array.from(groupIds) },
          state: 0,
          members: {
            some: {
              userId,
              state: 0,
            },
          },
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          notice: true,
          ownerId: true,
        },
      });
      groups.forEach((group) => groupsMap.set(group.id, group));
    }

    // 🚀 5️⃣ 组装结果（纯内存操作）
    const list = participants
      .map((participant) => {
        const conv = participant.conversation;
        if (!conv) return null;

        let user: ConversationTargetUser | null = null;

        if (conv.type === 1) {
          const userIds = conversationParticipantsMap.get(participant.conversationId) || [];

          // 找对方（不是自己）
          const peerUserId = userIds.find((id) => id !== userId);
          const peerUser = peerUserId ? usersMap.get(peerUserId) : null;

          if (peerUser) {
            user = {
              ...peerUser,
              nickname: (participant.remark || peerUser.nickname) ?? '',
            };
          }
        } else if (conv.type === 2 && conv.targetId) {
          const group = groupsMap.get(conv.targetId);
          if (!group) return null;

          return {
            ...conv,
            group,
            unreadCount: participant.unreadCount ?? 0,
            lastReadMessageId: participant.lastReadMessageId,
          };
        }

        return {
          ...conv,
          user,
          unreadCount: participant.unreadCount ?? 0,
          lastReadMessageId: participant.lastReadMessageId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return { list, total, page, pageSize };

    // const allUserIds: Set<string> = new Set([userId]);

    // // 获取每个会话的所有参与者，只针对私聊
    // const conversationParticipantsMap = new Map<string, string[]>();

    // for (const participant of participants) {
    //   if (participant.conversation.type === 1) {
    //     // 只处理私聊
    //     const otherParticipants = await this.prisma.conversationParticipant.findMany({
    //       where: {
    //         conversationId: participant.conversationId,
    //         userId: { not: userId }, // 排除自己
    //       },
    //       select: { userId: true },
    //     });

    //     const otherUserIds = otherParticipants.map((p) => p.userId);
    //     conversationParticipantsMap.set(participant.conversationId, otherUserIds);

    //     otherUserIds.forEach((id) => allUserIds.add(id));
    //   }
    //   // 群聊不在此处处理其他成员
    // }

    // // 批量获取所有相关用户的详细信息
    // const usersMap = new Map<string, Pick<UsersTypes.UsersItem, 'id' | 'nickname' | 'avatarUrl'>>();
    // if (allUserIds.size > 0) {
    //   const users = await this.userService.getMultipleUsers(Array.from(allUserIds));
    //   users.forEach((user) => {
    //     usersMap.set(user.id, user);
    //   });
    // }

    // const list = participants
    //   .map((participant) => {
    //     if (!participant.conversation) {
    //       return null;
    //     }

    //     let user: Pick<UsersTypes.UsersItem, 'id' | 'nickname' | 'avatarUrl'> | null = null;

    //     if (participant.conversation.type === 1) {
    //       // 私聊
    //       // 从缓存中获取对方用户ID
    //       const otherUserIds = conversationParticipantsMap.get(participant.conversationId) || [];
    //       const peerUserId = otherUserIds[0]; // 私聊只有一个对方
    //       const peerUser = usersMap.get(peerUserId);

    //       if (peerUser) {
    //         user = {
    //           ...peerUser,
    //           nickname: (participant.remark || peerUser?.nickname) ?? '',
    //         };
    //       }
    //     } else {
    //       // TODO 群聊
    //     }

    //     return {
    //       ...participant.conversation,
    //       user,
    //       unreadCount: participant.unreadCount ?? 0,
    //       lastReadMessageId: participant.lastReadMessageId,
    //     };
    //   })
    //   .filter((conversation): conversation is NonNullable<typeof conversation> =>
    //     Boolean(conversation),
    //   );

    // return { list, total, page, pageSize };
  }

  /**
   * 获取用户参与的所有会话 ID
   */
  async getUserConversationIds(userId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        userId: userId,
        isDeleted: false,
      },
      select: {
        conversationId: true,
      },
    });
    return participants.map((p) => p.conversationId);
  }
}
