import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { WebContentEventType } from '@c_chat/shared-types';
import { ipcRenderer } from 'electron';

export const webContentEventApi: WebContentEventType = {
  on: (channel, callback) => {
    const channels = Object.values(ELECTRON_TO_CLIENT_CHANNELS);
    if (channels.includes(channel)) {
      const handler = (_event: Electron.IpcRendererEvent, ...rest: any[]) => {
        (callback as any)(...rest);
      };
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    }
    return () => {};
  },

  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  emit: (eventName: string, data: any) => {
    // ipcRenderer.send('socket-emit', eventName, data);
    console.log('emit', eventName, data);
  },

  // 获取连接状态
  // getConnectionState: async () => {
  //   return ipcRenderer.invoke('socket-get-state');
  // },
};
