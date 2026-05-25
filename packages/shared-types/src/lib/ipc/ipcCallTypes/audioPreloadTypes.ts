import type { FileInfoListItem, IpcMethod } from '../ipcTypes';

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

export interface GetAudioInfoByLocalPathParams {
  filePath: string;
}

export interface AudioWaveformInfo {
  duration: number;

  sampleRate: number;

  channels: number;

  bitrate: number;

  waveform: number[];

  waveformBase64: string;
}

export interface AudioPreloadTypes {
  saveVoice: IpcMethod<SaveVoiceParams | undefined, FileInfoListItem>;
  getAudioInfoByLocalPath: IpcMethod<GetAudioInfoByLocalPathParams, AudioWaveformInfo>;
}
