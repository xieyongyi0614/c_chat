export enum UploadStatusEnum {
  uploading = 0,
  success = 1,
  fail = -1,
}

export interface LocalUploadTaskListItem {
  id: string;
  clientMsgId: string;

  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fingerprint: string;
  fileHash: string;

  fileId?: string;

  status: UploadStatusEnum;
  progress: number;
  uploadedBytes: number;

  createTime: number;
  updateTime: number;
}
