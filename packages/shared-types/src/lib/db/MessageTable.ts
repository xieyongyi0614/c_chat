export interface LocalMessageListItem {
  id: string;
  msgId: number;
  senderId: string;
  conversationId: string;
  content: string;
  type: number;
  state: number; // 0: success, 1: sending, 2: fail
  createTime: number;
  updateTime: number;
}
