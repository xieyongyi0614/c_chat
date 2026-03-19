import type { AuthTypes } from '@c_chat/shared-types';

const TOKEN_KEY = 'token';
const USER_INFO_KEY = 'userInfo';

export class BrowserCache {
  /** 认证 token */
  static setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  static clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }
  static isAuthenticated() {
    return !!BrowserCache.getToken();
  }

  /** 用户信息 */
  static logout() {
    BrowserCache.clearToken();
  }
}
