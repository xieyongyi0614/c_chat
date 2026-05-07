import type { MessageGroup as MessageGroupType } from '@c_chat/frontend/stores';
import { memo, useMemo } from 'react';
import MessageItem from './MessageItem';
import { MessageTypeEnum, type LocalMessageListItem } from '@c_chat/shared-types';

interface OwnerProps {
  group: MessageGroupType;
}

/**
 * 按mediaGroupId分组，相同的mediaGroupId视为一个图片组
 * 不同的mediaGroupId或其他类型消息视为独立消息
 */
const groupMessagesByMediaGroupId = (messages: LocalMessageListItem[]) => {
  const mediaGroupMap = new Map<string, LocalMessageListItem[]>();
  const grouped: (LocalMessageListItem | LocalMessageListItem[])[] = [];
  const addedMediaGroupIds = new Set<string>();

  // 第一次遍历：按mediaGroupId分组图片
  for (const msg of messages) {
    if (msg.type === MessageTypeEnum.Image && msg.mediaGroupId) {
      if (!mediaGroupMap.has(msg.mediaGroupId)) {
        mediaGroupMap.set(msg.mediaGroupId, []);
      }
      mediaGroupMap.get(msg.mediaGroupId)!.push(msg);
    }
  }

  // 第二次遍历：按原始顺序构建grouped数组
  for (const msg of messages) {
    // 如果是分组图片
    if (msg.type === MessageTypeEnum.Image && msg.mediaGroupId) {
      // 检查这个mediaGroupId是否已经添加过
      if (!addedMediaGroupIds.has(msg.mediaGroupId)) {
        // 添加整个分组
        grouped.push(mediaGroupMap.get(msg.mediaGroupId)!);
        addedMediaGroupIds.add(msg.mediaGroupId);
      }
      // 跳过后续的同mediaGroupId的消息，因为它们已经在分组中了
    } else {
      // 非分组消息直接添加
      grouped.push(msg);
    }
  }

  return grouped;
};

const MessageGroup = ({ group }: OwnerProps) => {
  const groupedMessages = useMemo(
    () => groupMessagesByMediaGroupId(group.messages),
    [group.messages],
  );

  return (
    <>
      {groupedMessages.map((item) => {
        const key = Array.isArray(item) ? `group-${item[0].mediaGroupId}` : item.id;
        return <MessageItem key={key} messageOrGroup={item} isRead={true} />;
      })}
      <div className="text-center text-xs">{group.dateKey}</div>
    </>
  );
};

export default memo(MessageGroup);
