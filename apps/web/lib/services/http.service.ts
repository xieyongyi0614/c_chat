import { createApiClient } from '@c_chat/shared-api';
import { PORTS } from '@c_chat/shared-config';
import { StoreDB } from '../db';

export const apiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORTS.SERVICE}`,
  timeout: 30000,
  clientInfo: {
    name: '@c_chat/web',
    version: '0.1.0',
    platform: 'browser',
  },
  tokenProvider: {
    getToken: () => StoreDB.get('accessToken'),
  },
  errorReporter: {
    report: ({ error }) => {
      if (error.response?.status === 401) {
        StoreDB.delete('accessToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
      }
    },
  },
});

export const httpService = apiClient.http;
