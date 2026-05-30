export * as db from './lib/db';

export * from './lib/webContentEvent.config';
export * from './lib/injected';
export * from './lib/errorCode';
export * from './lib/constants';
export * from './lib/fileType';
export * from './lib/toast.config';
export * from './lib/mediaPreview';

/** 统一端口配置 */
export const PORTS = {
  /** Electron 客户端 (Vite) */
  FRONTEND: 3000,
  /** Next.js Web 端 */
  WEB: 4000,
  /** 媒体预览窗口 (Vite) */
  MEDIA_PREVIEW: 3001,
  /** NestJS 后端服务 */
  SERVICE: 2000,
} as const;

/** IPC config */
export const IPC_CONFIG = {
  API_NAME: 'c_chat',
  CHANNEL_NAME: 'c_chat_api',
} as const;

export const UPLOAD_CHUNK_SIZE = 2 * 1024 * 1024;
