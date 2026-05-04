export enum UploadStatusEnum {
  waiting = 0, // 等待队列
  hashing = 1, // 计算 hash
  uploading = 2, // 上传中
  success = 3,
  fail = -1,
  paused = -2,
}

export interface LocalUploadTaskListItem {
  id: string;
  clientMsgId: string;

  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;

  fileId?: string;

  status: UploadStatusEnum;
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
