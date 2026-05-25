import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../core/database';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { jwtConfig } from '../config';
import { AuthTypes } from '../types/api/users-types';
import { ConfigType } from '@nestjs/config';
import { Prisma } from 'generated/prisma/client';

const BCRYPT_SALT_ROUNDS = 10;
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
const USER_STATE_NORMAL = 0;
const DEFAULT_GENDER = 2;

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
    const { email, username, password, phone, gender } = registerDto;

    await this.ensureUniqueAccount(email, phone);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          nickname: username,
          phone: phone || null,
          gender: gender ?? DEFAULT_GENDER,
          state: USER_STATE_NORMAL,
        },
        select: { id: true, email: true },
      });
      return { access_token: this.signToken(user) };
    } catch (error) {
      // 兜底竞态：两次预检通过、写入时仍可能撞到唯一索引
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT
      ) {
        throw new ConflictException('邮箱或手机号已被注册');
      }
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, state: true },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    if (user.state !== USER_STATE_NORMAL) {
      throw new UnauthorizedException('账号已被禁用或注销');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return { access_token: this.signToken(user) };
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
    if (!user || user.state !== USER_STATE_NORMAL) {
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

  private signToken(user: AuthTypes.JWTPayload): string {
    return this.jwtService.sign<AuthTypes.JWTPayload>({ id: user.id, email: user.email });
  }

  private async ensureUniqueAccount(email: string, phone?: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: phone ? { OR: [{ email }, { phone }] } : { email },
      select: { email: true, phone: true },
    });
    if (!existing) return;

    if (existing.email === email) {
      throw new ConflictException('该邮箱已被注册');
    }
    throw new ConflictException('该手机号已被注册');
  }
}
