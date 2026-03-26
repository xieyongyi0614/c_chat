import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { db, IPC_CONFIG, WINDOW_ID } from '@c_chat/shared-config';
import { IpcMessage } from '@c_chat/shared-types';
import { webContentEventApi } from './webContentEventPreload';

function getArgValue(key: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${key}=`));
  return arg ? arg.split('=')[1] : undefined;
}
const windowId = Number(getArgValue(WINDOW_ID)) | db.GLOBAL_WINDOW_ID;

contextBridge.exposeInMainWorld('electron', electronAPI);

contextBridge.exposeInMainWorld(IPC_CONFIG.API_NAME, {
  windowId,
  ipcCall: (message: IpcMessage) => {
    message.windowId = windowId;
    console.log('electron_client ipcCall', message);
    return ipcRenderer.invoke(IPC_CONFIG.CHANNEL_NAME, message);
  },
  ...webContentEventApi,
});
