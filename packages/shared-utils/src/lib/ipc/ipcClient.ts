import type { IpcTypes } from '@c_chat/shared-types';
import { createIpcClient } from './ipcRenderer';

export const ipc = createIpcClient<IpcTypes>();
