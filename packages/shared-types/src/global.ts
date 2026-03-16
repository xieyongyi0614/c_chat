import { IPC_CONFIG } from '@c_chat/shared-config';
import type { IpcBridgeApi } from './ipc/ipcTypes';

declare global {
  interface Window {
    [IPC_CONFIG.API_NAME]: IpcBridgeApi;
  }
}

export {};
