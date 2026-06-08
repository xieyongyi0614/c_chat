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
  className,
  isRead = true,
  labels,
  AudioControlsSlot,
  onRetryMessages,
  onOpenPreview,
  onAvatarPreview,
}: ChatMessageListProps<TMessage>) {
  const messageCount = useMemo(
    () => Object.values(msgMap).reduce((count, messages) => count + messages.length, 0),
    [msgMap],
  );

  return (
    <div className="flex size-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <ChatMessageScrollArea
        key="chat-message-scroll-area"
        conversationKey={conversationKey}
        messageCount={messageCount}
        hasMoreOlder={historyState.hasMoreOlder}
        isLoadingOlder={historyState.isLoadingOlder}
        isLoadingLatest={historyState.isLoadingLatest}
        loadOlderMessages={loadOlderMessages}
        className={className}
      >
        {!historyState.isLoadingLatest && messageCount === 0 && (
          <div className="flex min-h-40 flex-1 items-center justify-center text-sm text-muted-foreground">
            {labels?.empty ?? 'No messages yet'}
          </div>
        )}
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
            onAvatarPreview={onAvatarPreview}
          />
        ))}
      </ChatMessageScrollArea>
    </div>
  );
}

export const MessageList = memo(MessageListComponent) as typeof MessageListComponent;
