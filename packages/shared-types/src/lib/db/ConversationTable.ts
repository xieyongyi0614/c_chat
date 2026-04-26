export enum ConversationTypeEnum {
  Single = 1,
  Group = 2,
}

export interface DBConversationListItem {
  id: string;
  type: ConversationTypeEnum;
  target_id: string;
  target_name: string;
  target_avatar: string;
  unread_count: number;
  last_read_message_id: number;
  last_msg_content: string;
  last_msg_time: number;
  update_time: number;
  create_time: number;
}

export interface LocalConversationListItem {
  id: string;
  type: ConversationTypeEnum;
  targetId: string;
  targetName: string;
  targetAvatar: string;
  lastMsgContent: string;
  lastMsgTime: number;
  updateTime: number;
  createTime: number;
  unreadCount?: number;
  lastReadMessageId: number;
}
