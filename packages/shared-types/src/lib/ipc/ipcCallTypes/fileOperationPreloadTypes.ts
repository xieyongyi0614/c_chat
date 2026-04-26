import { IpcMethod } from '../ipcTypes';

export type SelectFilesParams = {
  filters?: Array<{ name: string; extensions: string[] }>;
  allowMultiSelect?: boolean;
};
export interface SelectFileInfo {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  extension: string;
  lastModified: number;
  isDirectory: boolean;
  isFile: boolean;
}

export type UploadFileByChunksParams = {
  filePath: string;
  uploadUrl?: string;
  chunkSize?: number;
  description?: string;
  alt?: string;
  headers?: Record<string, string>;
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

export interface FileOperationPreloadTypes {
  SelectFiles: IpcMethod<SelectFilesParams | undefined, SelectFileInfo[]>;
  UploadFileByChunks: IpcMethod<UploadFileByChunksParams, UploadFileByChunksResult>;
}
