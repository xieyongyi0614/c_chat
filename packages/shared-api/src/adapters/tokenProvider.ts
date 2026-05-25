import type { RequestContext } from './requestContext';

/**
 * Token 注入器：每个请求触发一次，HttpClient 拿到的字符串会拼成 `Authorization: Bearer <token>`。
 * 返回 null/undefined 表示当前上下文没有 token，HttpClient 不会塞 Authorization 头。
 * Electron 端从 sqlite 按 windowId 取，web 端可读 cookie/localStorage，RN 端读 AsyncStorage。
 */
export interface TokenProvider {
  getToken(ctx: RequestContext | null): string | null | Promise<string | null>;
}
