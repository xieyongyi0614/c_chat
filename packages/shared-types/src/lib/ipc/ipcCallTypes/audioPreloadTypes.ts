import { FileInfoListItem, IpcMethod } from '../ipcTypes';

interface MetaDataType {
  duration: number;
  waveform: number[];
  mimeType: string;
}
export interface SaveVoiceParams {
  buffer: ArrayBuffer;
  metadata: MetaDataType;
}
export interface SaveVoiceResponse {
  id: string;
  localPath: string;
  duration: number;
  waveform: number[];
  mimeType: string;
  size: number;
}

export interface AudioPreloadTypes {
  saveVoice: IpcMethod<SaveVoiceParams | undefined, FileInfoListItem>;
}
