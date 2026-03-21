import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IPC_CONFIG } from '@c_chat/shared-config';
import { IpcMessage } from '@c_chat/shared-types';
import './socketPreload';

contextBridge.exposeInMainWorld('electron', electronAPI);

const c_chat_api: typeof global.window.c_chat = {
  ipcCall: (message: IpcMessage) => {
    console.log('electron_client ipcCall', message);
    return ipcRenderer.invoke(IPC_CONFIG.CHANNEL_NAME, message);
  },
};
contextBridge.exposeInMainWorld(IPC_CONFIG.API_NAME, c_chat_api);
