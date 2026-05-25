import { storeTableClass } from '../../../db';
import type { TokenProvider } from '@c_chat/shared-api';

/**
 * 按 windowId 从 sqlite store 拿当前账号 token。
 * - 没拿到 windowId 时返回 null，HttpClient 会跳过 Authorization 注入。
 * - skipAuth 时 HttpClient 不会调本方法。
 */
export const electronTokenProvider: TokenProvider = {
  getToken(ctx) {
    const windowId = ctx?.windowId;
    if (!windowId || typeof windowId !== 'number') {
      return null;
    }
    return storeTableClass.getAccessToken(windowId) ?? null;
  },
};
