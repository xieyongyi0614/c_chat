export const ConversationType = {
  Single: 1,
  Group: 2,
} as const;
export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType];

export interface DBConversationListItem {
  id: string;
  type: ConversationType;
  target_id: string;
  target_name: string;
  target_avatar: string;
  unread_count: number;
  last_read_seq: bigint;
  last_msg_content: string;
  last_msg_time: number;
  update_time: number;
  create_time: number;
}

export interface LocalConversationListItem {
  id: string;
  type: ConversationType;
  targetId: string;
  targetName: string;
  targetAvatar: string;
  lastMsgContent: string;
  lastMsgTime: number;
  updateTime: number;
  createTime: number;
  unreadCount?: number;
  lastReadSeq: bigint;
}
