export interface LocalConversationListItem {
  id: string;
  type: number;
  targetId: string;
  lastMsgContent: string;
  lastMsgTime: number;
  updateTime: number;
  createTime: number;
  userNickname?: string;
  userAvatar?: string;
  groupName?: string;
  groupAvatar?: string;
}
