import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { WebContentEventType } from '@c_chat/shared-types';
import { contextBridge, ipcRenderer } from 'electron';

export const webContentEventApi: WebContentEventType = {
  on: (channel, callback) => {
    const channels = Object.values(ELECTRON_TO_CLIENT_CHANNELS);
    if (channels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...rest) => (callback as any)(...rest));
    }
  },

  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  emit: (eventName: string, data: any) => {
    // ipcRenderer.send('socket-emit', eventName, data);
  },

  // 获取连接状态
  // getConnectionState: async () => {
  //   return ipcRenderer.invoke('socket-get-state');
  // },
};
