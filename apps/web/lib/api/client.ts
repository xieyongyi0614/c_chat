import { createApiClient, RealtimeClient } from '@c_chat/shared-api';
import type { ConnectionObserver, IdentityProvider } from '@c_chat/shared-api';
import { PORTS } from '@c_chat/shared-config';
import { StoreDB } from '../db';
import { AuthSessionStorage } from '../services/authSession.storage';
import { useUserStore } from '../stores/user.store';

async function getAccessToken(): Promise<string | null> {
  const session = AuthSessionStorage.get();
  if (session) {
    return session.accessToken;
  }

  return (await StoreDB.get<string>('accessToken')) || null;
}

/**
 * Web 端 IdentityProvider 实现
 */
const identityProvider: IdentityProvider = {
  getIdentity: () => {
    const userInfo = useUserStore.getState().userInfo;
    return {
      userId: userInfo?.id,
      client: 'web',
    };
  },
};

/**
 * Web 端 ConnectionObserver 实现
 */
const connectionObserver: ConnectionObserver = {
  onDisconnected: (reason) => {
    console.warn('[Connection] Disconnected:', reason);
    // TODO: 可以在这里更新 UI 状态，显示断线提示
  },
  onReconnecting: (info) => {
    console.log(
      `[Connection] Reconnecting... attempt ${info.attempt}/${info.maxAttempts}, delay ${info.delay}ms`,
    );
    // TODO: 可以在这里更新 UI 状态，显示重连提示
  },
  onError: (error) => {
    console.error('[Connection] Error:', error);
    // TODO: 可以在这里更新 UI 状态，显示错误提示
  },
};

/**
 * 创建 HTTP 客户端
 */
export const apiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORTS.SERVICE}/api`,
  timeout: 30000,
  clientInfo: {
    name: '@c_chat/web',
    version: '0.1.0',
    platform: 'browser',
  },
  tokenProvider: {
    getToken: async () => {
      return getAccessToken();
    },
  },
  errorReporter: {
    report: ({ error }) => {
      if (error.response?.status === 401) {
        AuthSessionStorage.clear();
        StoreDB.delete('accessToken');
        StoreDB.delete('userInfo');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
      }
    },
  },
});

/**
 * 创建 RealtimeClient 实例
 */
let realtimeClient: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient | null {
  return realtimeClient;
}

export async function initRealtimeClient(): Promise<RealtimeClient> {
  if (realtimeClient) {
    return realtimeClient;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${PORTS.SERVICE}/chat`;

  realtimeClient = new RealtimeClient({
    url: socketUrl,
    tokenProvider: {
      getToken: async () => {
        return getAccessToken();
      },
    },
    identityProvider,
    observer: connectionObserver,
    name: 'web',
  });

  await realtimeClient.connect();
  return realtimeClient;
}

export function destroyRealtimeClient(): void {
  if (realtimeClient) {
    realtimeClient.destroy();
    realtimeClient = null;
  }
}

export const httpService = apiClient.http;
export const authService = apiClient.auth;
export const uploadService = apiClient.upload;
