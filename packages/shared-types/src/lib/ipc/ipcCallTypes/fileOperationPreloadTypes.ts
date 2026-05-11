import { FileType } from '@c_chat/shared-config';
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
  fileType: FileType;
  mimeType: string;
  extension: string;
  lastModified: number;
  isDirectory: boolean;
  isFile: boolean;
  url?: string;
  metadata?: FileMetadata;
}
// | ImageMetadata | VideoMetadata;
export type FileMetadata = VoiceMetadata;
export interface VoiceMetadata {
  type: 'voice';
  duration: number;
  waveform: number[];
  codec?: string;
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
  path: string;
};

export interface FileOperationPreloadTypes {
  SelectFiles: IpcMethod<SelectFilesParams | undefined, FileInfoListItem[]>;
  ReadLocalFile: IpcMethod<ReadLocalFileParams, Uint8Array<ArrayBuffer>>;
  UploadFileByChunks: IpcMethod<UploadFileByChunksParams, UploadFileByChunksResult>;
}
