// src/common/services/request-context.service.ts
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId?: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

@Injectable()
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  /**
   * 运行带上下文的代码（用于中间件）
   */
  run(context: RequestContext, callback: () => void): void {
    this.asyncLocalStorage.run(context, callback);
  }

  /**
   * 获取当前上下文
   */
  getContext(): RequestContext {
    return this.asyncLocalStorage.getStore() || {};
  }

  /**
   * 更新当前上下文（合并新数据）
   */
  setContext(newContext: Partial<RequestContext>): void {
    const currentContext = this.getContext();
    this.asyncLocalStorage.enterWith({ ...currentContext, ...newContext });
  }

  /**
   * 便捷方法：设置用户信息
   */
  setUser(userId: string, userRole?: string, userEmail?: string): void {
    this.setContext({ userId, userRole, userEmail });
  }

  /**
   * 便捷方法：设置请求ID
   */
  setRequestId(requestId: string): void {
    this.setContext({ requestId });
  }

  // 获取器方法
  getRequestId(): string | undefined {
    return this.getContext().requestId;
  }

  getUserId(): string | undefined {
    return this.getContext().userId;
  }

  getUserRole(): string | undefined {
    return this.getContext().userRole;
  }

  getUserEmail(): string | undefined {
    return this.getContext().userEmail;
  }
}
