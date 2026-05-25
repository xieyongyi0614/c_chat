import { IPC_CONFIG } from '@c_chat/shared-config';
import type { IpcBridgeApi } from './lib/ipc/ipcTypes';
import type { WebContentEventType } from './lib/ipc/webContentEvent';
import type { WindowToolsEventType } from './lib/ipc/windowToolsEvent';

declare global {
  interface Window {
    [IPC_CONFIG.API_NAME]: IpcBridgeApi & WebContentEventType & WindowToolsEventType;
  }
}

export {};
