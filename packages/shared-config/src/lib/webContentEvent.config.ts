/** electron ipc 通信channel 列表 */
export const ELECTRON_TO_CLIENT_CHANNELS = {
  /** 通用 */
  ERROR: 'error',

  /** socket 相关channel */
  SocketConnSuccess: 'socketConnSuccess',
  SocketDisconnected: 'socketDisconnected',
  SocketReconnecting: 'socketReconnecting',
  SocketMessage: 'socketMessage',

  /** toast 相关channel */
  Toast: 'toast',
} as const;
