export const ELECTRON_TO_CLIENT_CHANNELS = {
  /** socket 相关channel */
  SocketConnSuccess: 'socketConnSuccess',
  SocketDisconnected: 'socketDisconnected',
  SocketReconnecting: 'socketReconnecting',
  SocketError: 'socketError',

  /** toast 相关channel */
  Toast: 'toast',
} as const;
