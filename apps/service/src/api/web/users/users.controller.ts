import { Controller, Body, Get, Patch, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth';
// import { SAFE_USER_SELECT } from './constants';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateUserProfileDto } from './dto/user.dto';
import { JwtRequest } from 'src/types/api/base-types';
import { UsersService } from './users.service';

@ApiTags('用户管理')
@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  // @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UsersTypes.UserRole.ADMIN)
  // @UsePipes(new ValidationPipe({ transform: true }))
  // @ApiOperation({ summary: '获取用户列表' })
  // @ApiResponse({ status: 200, description: '获取用户列表成功' })
  // async list(
  //   @Query() query: UserSearchDto
  // ): Promise<API.ApiResponseList<UsersTypes.UsersItem>['data']> {
  //   const { page, pageSize, username, email } = query;
  //   const where: Record<string, unknown> = {
  //     deletedAt: null
  //   };

  //   if (username) {
  //     where.username = { contains: username };
  //   }
  //   if (email) {
  //     where.email = { contains: email };
  //   }

  //   const res = await this.prisma.user.findMany({
  //     ...paginationTrans(page, pageSize),
  //     where,
  //     select: SAFE_USER_SELECT,
  //     orderBy: { createdAt: 'desc' }
  //   });

  //   const total = await this.prisma.user.count({ where });

  //   return {
  //     list: res,
  //     total,
  //     page,
  //     pageSize,
  //     totalPage: Math.ceil(total / pageSize)
  //   };
  // }

  // @Get('userInfo')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: '获取当前用户信息' })
  // @ApiResponse({ status: 200, description: '获取用户信息成功' })
  // async userInfo(@CurrentUser('id') userId: string) {
  //   const user = await this.prisma.user.findFirst({
  //     where: {
  //       id: userId,
  //       deletedAt: null
  //     },
  //     select: SAFE_USER_SELECT
  //   });
  //   return user;
  // }

  // @Get(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UsersTypes.UserRole.ADMIN)
  // @ApiOperation({ summary: '根据ID获取用户详情' })
  // @ApiResponse({ status: 200, description: '获取用户详情成功' })
  // async getById(@Param('id') id: string) {
  //   const user = await this.prisma.user.findFirst({
  //     where: {
  //       id,
  //       deletedAt: null
  //     },
  //     select: SAFE_USER_SELECT
  //   });
  //   return user;
  // }

  // @Put(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UsersTypes.UserRole.ADMIN)
  // @ApiOperation({ summary: '更新用户信息' })
  // @ApiResponse({ status: 200, description: '用户信息更新成功' })
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateData: { username?: string; bio?: string; avatar?: string }
  // ) {
  //   const user = await this.prisma.user.update({
  //     where: {
  //       id,
  //       deletedAt: null // 确保不能更新已软删除的用户
  //     },
  //     data: updateData,
  //     select: SAFE_USER_SELECT
  //   });
  //   return user;
  // }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UsersTypes.UserRole.ADMIN)
  // @ApiOperation({ summary: '软删除用户' })
  // @ApiResponse({ status: 200, description: '用户软删除成功' })
  // async delete(@Param('id') id: string) {
  //   const user = await this.prisma.user.update({
  //     where: { id },
  //     data: { deletedAt: new Date() },
  //     select: SAFE_USER_SELECT
  //   });
  //   return user;
  // }

  // @Post('sign-up')
  // @ApiOperation({ summary: '用户注册' })
  // @ApiResponse({ status: 201, description: '用户注册成功' })
  // async register(@Body() registerDto: RegisterDto): Promise<UsersTypes.AuthResponse> {
  //   return this.authService.register(registerDto);
  // }

  // @Post('sign-in')
  // @ApiOperation({ summary: '用户登录' })
  // @ApiResponse({ status: 200, description: '用户登录成功' })
  // async login(@Body() loginDto: LoginDto): Promise<UsersTypes.AuthResponse> {
  //   return this.authService.login(loginDto);
  // }

  @Get('userInfo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  getProfile(@Request() req: JwtRequest) {
    return req.user;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  updateProfile(@Request() req: JwtRequest, @Body() dto: UpdateUserProfileDto) {
    return this.usersService.updateProfile(req.user.id, {
      nickname: dto.nickname?.trim(),
      avatarUrl: dto.avatarUrl?.trim(),
    });
  }
}
