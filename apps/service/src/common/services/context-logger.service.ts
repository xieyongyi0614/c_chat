// src/common/services/context-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

@Injectable()
export class ContextLoggerService {
  constructor(private readonly contextService: RequestContextService) {}

  private formatMessage(
    message: object | string,
    context?: string,
  ): { message: string; context?: string } {
    const requestContext = this.contextService.getContext();
    const { requestId, userId, userRole, ip } = requestContext;

    // 构建前缀
    const prefixParts: string[] = [];
    if (requestId) prefixParts.push(`ReqID:${requestId}`);
    if (userId) prefixParts.push(`User:${userId}`);
    if (userRole) prefixParts.push(`Role:${userRole}`);
    if (ip) prefixParts.push(`IP:${ip}`);

    const prefix = prefixParts.length > 0 ? `[${prefixParts.join('|')}]` : '';
    const strMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    const formattedMessage = prefix ? `${prefix} ${strMessage}` : strMessage;

    return { message: formattedMessage, context };
  }

  log(message: object | string, context?: string): void {
    const { message: formattedMessage, context: ctx } = this.formatMessage(message, context);
    Logger.log(formattedMessage, ctx);
  }

  error(message: object | string, trace?: string, context?: string): void {
    const { message: formattedMessage, context: ctx } = this.formatMessage(message, context);
    Logger.error(formattedMessage, trace, ctx);
  }

  warn(message: object | string, context?: string): void {
    const { message: formattedMessage, context: ctx } = this.formatMessage(message, context);
    Logger.warn(formattedMessage, ctx);
  }

  debug(message: object | string, context?: string): void {
    const { message: formattedMessage, context: ctx } = this.formatMessage(message, context);
    Logger.debug(formattedMessage, ctx);
  }

  verbose(message: object | string, context?: string): void {
    const { message: formattedMessage, context: ctx } = this.formatMessage(message, context);
    Logger.verbose(formattedMessage, ctx);
  }

  /**
   * 专用方法：记录权限检查日志
   */
  logPermission(
    action: 'GRANTED' | 'DENIED',
    requiredRoles?: string[],
    userRole?: string,
    context?: string,
  ): void {
    const roleInfo = requiredRoles ? `Required:[${requiredRoles.join(',')}]` : '';
    const userInfo = userRole ? `UserRole:${userRole}` : '';
    const details = [roleInfo, userInfo].filter(Boolean).join(' ');

    const message = `Permission ${action}${details ? ` - ${details}` : ''}`;

    if (action === 'GRANTED') {
      this.log(message, context);
    } else {
      this.warn(message, context);
    }
  }

  /**
   * 专用方法：记录认证日志
   */
  logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'TOKEN_VALIDATED' | 'TOKEN_EXPIRED',
    details?: string,
    context?: string,
  ): void {
    const message = `Auth ${action}${details ? ` - ${details}` : ''}`;
    this.log(message, context);
  }
}
