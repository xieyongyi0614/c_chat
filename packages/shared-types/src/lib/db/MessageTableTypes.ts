import { MessageType } from '@c_chat/shared-config';

export interface LocalMessageListItem {
  id: string;
  conversationId: string;
  msgId: number | null;
  clientMsgId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatusEnum;
  updateTime: number;
  createTime: number;
  localTime: number;
  fileId?: string;
  fileUrl?: string;
  mediaGroupId?: string;
  progress?: number;
  // files?: FileInfoListItem[];
}

export enum MessageStatusEnum {
  default = 0,
  sending = 1,
  success = 2,
  uploading = 3,
  fail = -1,
}
