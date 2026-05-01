import { IpcMethod } from '../ipcTypes';

export type SelectFilesParams = {
  filters?: Array<{ name: string; extensions: string[] }>;
  allowMultiSelect?: boolean;
};
export interface FileInfoListItem {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  extension: string;
  lastModified: number;
  isDirectory: boolean;
  isFile: boolean;
  url?: string;
}

export type UploadFileByChunksParams = {
  filePath?: string;
  fileBuffer?: number[];
  fileName?: string;
  uploadUrl?: string;
  chunkSize?: number;
  description?: string;
  alt?: string;
  headers?: Record<string, string>;
  clientMsgId?: string;
};

export type UploadFileByChunksResult = {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number;
  isComplete: boolean;
  serverResponse?: any;
};

export type ReadLocalFileParams = {
  filePath: string;
};

export interface FileOperationPreloadTypes {
  SelectFiles: IpcMethod<SelectFilesParams | undefined, FileInfoListItem[]>;
  ReadLocalFile: IpcMethod<ReadLocalFileParams, Uint8Array>;
  UploadFileByChunks: IpcMethod<UploadFileByChunksParams, UploadFileByChunksResult>;
}
