import * as crypto from 'crypto';

/**
 * 为私聊生成确定性的会话 ID
 * 算法：md5(sort([user1Id, user2Id]).join('_'))
 */
export function generatePrivateConversationId(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  const combined = sortedIds.join('_');
  return crypto.createHash('md5').update(combined).digest('hex');
}
