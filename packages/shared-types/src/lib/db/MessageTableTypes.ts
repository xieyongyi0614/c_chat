import { MessageType } from '@c_chat/shared-config';

export interface LocalMessageListItem {
  id: string;
  conversationId: string;
  msgId: number | null;
  clientMsgId: string;
  senderId: string;
  senderNickname?: string;
  senderAvatar?: string;
  senderEmail?: string;
  content: string;
  type: MessageType;
  status: MessageStatusEnum;
  updateTime: number;
  createTime: number;
  localTime: number;
  /** media */
  fileId?: string;
  fileUrl?: string;
  filePath?: string;
  mediaGroupId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  waveform?: string;
  duration?: number;
  progress?: number;
}

export enum MessageStatusEnum {
  default = 0,
  sending = 1,
  success = 2,
  uploading = 3,
  fail = -1,
}
