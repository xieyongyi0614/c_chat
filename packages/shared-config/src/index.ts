/** electron 渲染端口 */
export const ELECTRON_RENDERER_PORT = 3000;

/** IPC 配置项 */
export const IPC_CONFIG = {
  // 渲染进程 API 名称
  API_NAME: 'c_chat',
  // 主进程监听的 IPC 通道名称
  CHANNEL_NAME: 'c_chat_api',
} as const;
