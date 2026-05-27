import type { MessageType } from '@c_chat/shared-config';

export const MessageStatus = {
  default: 0,
  sending: 1,
  success: 2,
  uploading: 3,
  fail: -1,
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export interface LocalMessageListItem {
  id: string;
  conversationId: string;
  seq: number | null;
  clientMsgId: string;
  senderId: string;
  senderNickname?: string;
  senderAvatar?: string;
  senderEmail?: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
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
