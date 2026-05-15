export interface VoiceRecordResult {
  blob: Blob;

  duration: number;

  waveform: number[];

  mimeType: string;
}

export interface VoiceMessage {
  id: string;

  localPath?: string;

  remoteUrl?: string;

  duration: number;

  waveform: number[];

  mimeType: string;

  size: number;

  status: 'recording' | 'processing' | 'uploading' | 'success' | 'failed';

  createTime: number;
}

export interface AudioPlayerState {
  currentId?: string;

  playing: boolean;

  currentTime: number;

  duration: number;

  playbackRate: number;

  progressMap: Record<string, number>;
}
