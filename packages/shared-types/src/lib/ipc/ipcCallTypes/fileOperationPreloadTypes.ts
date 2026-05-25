import type { FileType } from '@c_chat/shared-config';
import type { IpcMethod } from '../ipcTypes';

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
export type FileMetadata = AudioMetadata;
export interface AudioMetadata {
  type: 'audio';
  duration: number;
  waveform: string;
  codec?: string;
  size: number;
}

export type ReadLocalFileParams = {
  path: string;
};

export type OpenLocalFileParams = {
  path: string;
};

export type SaveFileParams = {
  fileName: string;
  data: number[];
  filters?: Array<{ name: string; extensions: string[] }>;
};

export type SaveFileResult = {
  canceled: boolean;
  filePath?: string;
};

export interface FileOperationPreloadTypes {
  SelectFiles: IpcMethod<SelectFilesParams | undefined, FileInfoListItem[]>;
  ReadLocalFile: IpcMethod<ReadLocalFileParams, Uint8Array<ArrayBuffer>>;
  OpenLocalFile: IpcMethod<OpenLocalFileParams, boolean>;
  SaveFile: IpcMethod<SaveFileParams, SaveFileResult>;
}
