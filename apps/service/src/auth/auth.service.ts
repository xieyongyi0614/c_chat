import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../core/database';
import { RegisterDto, LoginDto, AuthResponseDto } from '.';
import * as bcrypt from 'bcryptjs';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { jwtConfig } from 'src/config';
import { AuthTypes } from 'src/types/api/users-types';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
  ) {}

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, username, password } = registerDto;

    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 检查手机号是否已存在（如果提供了手机号）
    if (registerDto.phone) {
      const existingPhoneUser = await this.prisma.user.findUnique({
        where: { phone: registerDto.phone },
      });
      if (existingPhoneUser) {
        throw new ConflictException('该手机号已被注册');
      }
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname: username, // 将 username 映射到 nickname
        phone: registerDto.phone || null,
        gender: registerDto.gender ?? 2, // 默认其他
        state: 0, // 正常状态
      },
    });

    const payload = { id: user.id, email: user.email };
    const access_token = this.jwtService.sign<AuthTypes.JWTPayload>(payload);

    return { access_token };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { password: true, id: true, email: true, state: true },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查账号状态
    if (user.state !== 0) {
      throw new UnauthorizedException('账号已被禁用或注销');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成JWT token
    const payload = { id: user.id, email: user.email };
    const access_token = this.jwtService.sign<AuthTypes.JWTPayload>(payload);

    return { access_token };
  }

  /**
   * 验证用户（供 JWT Strategy 使用）
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        state: true,
        updateTime: true,
      },
    });
    if (!user || user.state !== 0) {
      return null;
    }

    return user;
  }

  async authenticateSocket(client: Socket) {
    const auth = client.handshake.auth as AuthTypes.WsHandshakeAuth;
    if (!auth?.token) {
      throw new WsException('未提供认证信息');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthTypes.JWTPayload>(auth.token, {
        secret: this.jwt.secret,
      });

      if (!payload?.id) {
        throw new WsException('无效的用户凭证');
      }
      return payload;
    } catch (error) {
      throw new WsException(`认证失败: ${(error as Error)?.message}`);
    }
  }
}
