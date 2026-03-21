// src/main/preload/socket-preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const socketAPI = {
  // 监听 Socket 事件（安全白名单）
  on: (channel: string, callback: (data: any) => void) => {
    const validChannels = [
      'socket-connected',
      'socket-disconnected',
      'socket-reconnecting',
      'socket-error',
      'socket-event:message',
      'socket-event:user-joined',
      'socket-event:user-left',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  },

  // 移除监听
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // 发送事件（安全封装）
  emit: (eventName: string, data: any) => {
    ipcRenderer.send('socket-emit', eventName, data);
  },

  // 获取连接状态
  getConnectionState: async () => {
    return ipcRenderer.invoke('socket-get-state');
  },
};

contextBridge.exposeInMainWorld('socketAPI', socketAPI);
