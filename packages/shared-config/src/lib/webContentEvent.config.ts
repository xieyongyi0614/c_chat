/** electron ipc 通信channel 列表 */
export const ELECTRON_TO_CLIENT_CHANNELS = {
  /** 通用 */
  ERROR: 'error',

  /** socket 相关channel */
  SocketConnSuccess: 'socketConnSuccess',
  SocketDisconnected: 'socketDisconnected',
  SocketReconnecting: 'socketReconnecting',

  newUpdateMessage: 'newUpdateMessage',
  MediaPreviewPayloadUpdated: 'mediaPreviewPayloadUpdated',

  /** 上传进度 */
  uploadProgress: 'uploadProgress',

  /** toast 相关channel */
  Toast: 'toast',
} as const;
