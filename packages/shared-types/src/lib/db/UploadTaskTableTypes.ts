export const UploadStatus = {
  /** 等待队列 */
  waiting: 0,
  /** 计算 hash */
  hashing: 1,
  /** 上传中 */
  uploading: 2,
  success: 3,
  fail: -1,
  paused: -2,
} as const;
export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];

export interface LocalUploadTaskListItem {
  id: string;
  clientMsgId: string;

  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;

  fileId?: string;

  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  isRunning: number;
  uploadSessionId: string;
  /** 发起上传的渲染进程窗口，用于冷启动续传时发消息 */
  windowId?: number;
  /** 与服务端 init 时一致，续传时用于 readChunk */
  chunkSize?: number;
  uploadedChunks: number;
  totalChunks: number;
  isInstant: number;
  errorMessage: string;

  createTime: number;
  updateTime: number;
}
