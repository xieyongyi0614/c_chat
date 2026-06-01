import type { AuthTypes } from '@c_chat/shared-types';

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_INFO_KEY = 'userInfo';

export interface AuthSession {
  accessToken: string;
  userInfo: AuthTypes.GetUserInfoResponse | null;
}

export class AuthSessionStorage {
  static get(): AuthSession | null {
    if (typeof window === 'undefined') return null;

    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) return null;

    const userInfoStr = window.localStorage.getItem(USER_INFO_KEY);

    return {
      accessToken,
      userInfo: userInfoStr ? (JSON.parse(userInfoStr) as AuthTypes.GetUserInfoResponse) : null,
    };
  }

  static set(session: AuthSession): void {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);

    if (session.userInfo) {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(session.userInfo));
    } else {
      window.localStorage.removeItem(USER_INFO_KEY);
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_INFO_KEY);
  }
}
