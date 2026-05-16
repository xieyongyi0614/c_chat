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

export interface FileOperationPreloadTypes {
  SelectFiles: IpcMethod<SelectFilesParams | undefined, FileInfoListItem[]>;
  ReadLocalFile: IpcMethod<ReadLocalFileParams, Uint8Array<ArrayBuffer>>;
}
