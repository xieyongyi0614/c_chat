export * as db from './lib/db';

export * from './lib/webContentEvent.config';
export * from './lib/injected';
export * from './lib/errorCode';
export * from './lib/constants';
export * from './lib/fileType';
export * from './lib/toast.config';
export * from './lib/mediaPreview';
export * from './lib/callWindow';

/** electron renderer port */
export const ELECTRON_RENDERER_PORT = 3000;

/** IPC config */
export const IPC_CONFIG = {
  API_NAME: 'c_chat',
  CHANNEL_NAME: 'c_chat_api',
} as const;

export const UPLOAD_CHUNK_SIZE = 2 * 1024 * 1024;
