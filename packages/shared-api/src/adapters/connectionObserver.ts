import type { SocketErrorCode } from '@c_chat/shared-config';

/**
 * Socket 连接生命周期通知。平台据此把状态推给各自的 UI 层
 * （Electron 推渲染进程，Web/RN 推各自的状态层）。
 * 只覆盖有真实消费者的三个事件，连接成功由业务事件自行处理，不在此列。
 */
export interface ConnectionObserver {
  onDisconnected?(reason: string): void;
  onReconnecting?(info: { attempt: number; maxAttempts: number; delay: number }): void;
  onError?(error: { errorCode: SocketErrorCode; errorMessage: string }): void;
}
