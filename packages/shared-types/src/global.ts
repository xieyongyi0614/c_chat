import { IPC_CONFIG } from '@c_chat/shared-config';
import type { IpcBridgeApi } from './lib/ipc/ipcTypes';
import { SocketAPIType } from './lib/socketApiTypes';

declare global {
  interface Window {
    [IPC_CONFIG.API_NAME]: IpcBridgeApi;
    socketAPI: SocketAPIType;
  }
}

export {};
