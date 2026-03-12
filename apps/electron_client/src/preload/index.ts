import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IPC_CONFIG } from '@c_chat/shared-config';

// Custom APIs for renderer
const api = {
  notifyLoggedIn: () => ipcRenderer.send('auth:logged-in'),
  notifyLoggedOut: () => ipcRenderer.send('auth:logged-out'),
  closeWindow: () => ipcRenderer.send('window:close'),
  openSettings: () => ipcRenderer.send('window:open-settings'),
  sendApi: (message: any) => ipcRenderer.invoke(IPC_CONFIG.CHANNEL_NAME, message),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld(IPC_CONFIG.API_NAME, {
      ipcCall: (message: any) => {
        console.log('ipcCall', message);
        return ipcRenderer.invoke(IPC_CONFIG.CHANNEL_NAME, message);
      },
    });
  } catch (error) {
    console.error('ipc error', error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
