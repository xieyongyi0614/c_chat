import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database';
import { UserSearchDto } from './dto/user.dto';
import { paginationTrans } from 'src/utils';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // async create(createTagDto: CreateTagDto): Promise<TagTypes.PrismaTag> {
  //   const { name, slug } = createTagDto;

  //   const initialData = { name, slug: slug || 'temp' };

  //   const result = await this.prisma.$transaction(async (prisma) => {
  //     const createdTag = await prisma.tag.create({ data: initialData });

  //     /** slug为空，则使用ID作为slug */
  //     if (!slug) {
  //       return await prisma.tag.update({
  //         where: { id: createdTag.id },
  //         data: { slug: createdTag.id }
  //       });
  //     }

  //     return createdTag;
  //   });

  //   return result;
  // }

  async list(userSearchDto: UserSearchDto) {
    const { page, pageSize, nickname, email, word } = userSearchDto;
    const where: Prisma.UserWhereInput = {};

    if (nickname) {
      where.nickname = { contains: nickname };
    }
    if (email) {
      where.email = { contains: email };
    }
    if (word) {
      where.AND = [{ nickname: { contains: word } }, { email: { contains: word } }];
    }
    if (userSearchDto.excludeUserId) {
      where.id = { not: userSearchDto.excludeUserId };
    }

    const pagination = paginationTrans(page, pageSize);

    const [res, total] = await Promise.all([
      this.prisma.user.findMany({
        ...pagination,
        where: where,
        orderBy: { createTime: 'desc' },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          state: true,
          updateTime: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { list: res, total, page, pageSize, totalPage: Math.ceil(total / pageSize) };
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        // state: true,
        // updateTime: true,
      },
    });
  }

  async updateProfile(id: string, data: { nickname?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.nickname !== undefined ? { nickname: data.nickname } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        state: true,
      },
    });
  }

  async getMultipleUsers(userIds: string[]) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
      },
    });
  }

  // async getById(id: string): Promise<TagTypes.PrismaTag> {
  //   return await this.prisma.tag.findUnique({ where: { id } });
  // }

  // async update(id: string, updateTagDto: UpdateTagDto): Promise<TagTypes.PrismaTag> {
  //   return await this.prisma.tag.update({
  //     where: { id },
  //     data: updateTagDto
  //   });
  // }

  // async delete(id: string): Promise<TagTypes.PrismaTag> {
  //   // 检查是否有文章使用此标签
  //   const articlesCount = await this.prisma.articleTag.count({
  //     where: { tagId: id }
  //   });

  //   if (articlesCount > 0) {
  //     throw new Error('无法删除该标签，因为还有文章在使用此标签');
  //   }

  //   const res = await this.prisma.tag.delete({ where: { id } });
  //   return res;
  // }
}
