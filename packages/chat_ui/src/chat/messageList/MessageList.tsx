import { memo, useMemo } from 'react';
import { ChatMessageScrollArea } from '../chatMessage';
import { MessageListGroup } from './MessageListGroup';
import type { ChatMessageListItem, ChatMessageListProps } from './types';

const getGroupIds = (groups: Map<string, string[]> | Record<string, string[]>, dateKey: string) => {
  if (groups instanceof Map) {
    return [...(groups.get(dateKey) ?? [])].reverse();
  }

  return [...(groups[dateKey] ?? [])].reverse();
};

function MessageListComponent<TMessage extends ChatMessageListItem>({
  conversationKey,
  dateKeys,
  groups,
  msgMap,
  currentUser,
  isGroupConversation,
  senderProfiles,
  historyState,
  loadOlderMessages,
  fileResolver,
  isRead = true,
  labels,
  AudioControlsSlot,
  onRetryMessages,
  onOpenPreview,
}: ChatMessageListProps<TMessage>) {
  const messageCount = useMemo(
    () => Object.values(msgMap).reduce((count, messages) => count + messages.length, 0),
    [msgMap],
  );

  return (
    <div className="flex size-full flex-1">
      <ChatMessageScrollArea
        key="chat-message-scroll-area"
        conversationKey={conversationKey}
        messageCount={messageCount}
        hasMoreOlder={historyState.hasMoreOlder}
        isLoadingOlder={historyState.isLoadingOlder}
        isLoadingLatest={historyState.isLoadingLatest}
        loadOlderMessages={loadOlderMessages}
      >
        {dateKeys.map((dateKey) => (
          <MessageListGroup
            key={dateKey}
            dateKey={dateKey}
            groupIds={getGroupIds(groups, dateKey)}
            msgMap={msgMap}
            currentUser={currentUser}
            isRead={isRead}
            isGroupConversation={isGroupConversation}
            senderProfiles={senderProfiles}
            fileResolver={fileResolver}
            labels={labels}
            AudioControlsSlot={AudioControlsSlot}
            onRetryMessages={onRetryMessages}
            onOpenPreview={onOpenPreview}
          />
        ))}
      </ChatMessageScrollArea>
    </div>
  );
}

export const MessageList = memo(MessageListComponent) as typeof MessageListComponent;
