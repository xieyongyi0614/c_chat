export class InitUploadDto {
  fileName: string;
  fileSize: number;
  fileHash: string;
  chunkSize: number;
  mimeType?: string;
  clientMsgId?: string;
  conversationId?: string;
  messageType?: number;
  mediaGroupId?: string;
  content?: string;
  duration?: number;
  waveform?: string;
}
