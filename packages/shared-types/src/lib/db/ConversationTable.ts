export enum ConversationTypeEnum {
  Single = 1,
  Group = 2,
}

export interface LocalConversationListItem {
  id: string;
  type: ConversationTypeEnum;
  groupId: string;
  lastMsgContent: string;
  lastMsgTime: number;
  updateTime: number;
  createTime: number;
  userNickname?: string;
  userAvatar?: string;
  groupName?: string;
  groupAvatar?: string;
  unreadCount?: number;
  lastReadMessageId: number;
}
