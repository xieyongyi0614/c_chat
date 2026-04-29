/** 0: success, 1: sending, 2: fail */
// export enum MessageStateEnum {
//   Success = 0,
//   Sending = 1,
//   Fail = 2,
// }

/** 0:文本, 1:图片, 2:文件, 3:音频, 4:视频 */
export enum MessageTypeEnum {
  Text = 0,
  Image = 1,
  File = 2,
  Audio = 3,
  Video = 4,
  // Location = 5,
  // Contact = 6,
  // Sticker = 7,
  // RedPacket = 8,
  // System = 9,
  // Call = 10,
  // Reply = 11,
  // Forward = 12,
  // Poll = 13,
  // Whiteboard = 14,
  // Markdown = 15,
}

export interface LocalMessageListItem {
  id: string;
  conversationId: string;
  msgId: number;
  clientMsgId: string;
  senderId: string;
  content: string;
  type: MessageTypeEnum;
  status: MessageStatusEnum;
  updateTime: number;
  createTime: number;
  localTime: number;
  fileId?: string;
  mediaGroupId?: string;
}

export enum MessageStatusEnum {
  default = 0,
  sending = 1,
  success = 2,
  fail = -1,
}
