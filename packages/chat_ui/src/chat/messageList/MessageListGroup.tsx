import { memo, type ReactNode } from 'react';
import { MessageListItem } from './MessageListItem';
import type { ChatMessageFileResolver } from '../chatMessage';
import type {
  ChatMessageAudioControlsSlotProps,
  ChatAvatarPreviewPayload,
  ChatMessageListItem,
  ChatMessageListLabels,
  ChatMessageOpenPreviewPayload,
  ChatMessageSenderProfile,
} from './types';

interface MessageListGroupProps<TMessage extends ChatMessageListItem> {
  dateKey: string;
  groupIds: string[];
  msgMap: Record<string, TMessage[]>;
  currentUser?: ChatMessageSenderProfile | null;
  isRead: boolean;
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, ChatMessageSenderProfile>;
  fileResolver: ChatMessageFileResolver;
  labels?: ChatMessageListLabels;
  AudioControlsSlot?: (props: ChatMessageAudioControlsSlotProps<TMessage>) => ReactNode;
  onRetryMessages?: (payload: { messages: TMessage[] }) => void | Promise<void>;
  onOpenPreview?: (payload: ChatMessageOpenPreviewPayload<TMessage>) => void;
  onAvatarPreview?: (payload: ChatAvatarPreviewPayload) => void;
}

function MessageListGroupComponent<TMessage extends ChatMessageListItem>({
  dateKey,
  groupIds,
  msgMap,
  currentUser,
  isRead,
  isGroupConversation,
  senderProfiles,
  fileResolver,
  labels,
  AudioControlsSlot,
  onRetryMessages,
  onOpenPreview,
  onAvatarPreview,
}: MessageListGroupProps<TMessage>) {
  return (
    <>
      <div className="text-center text-xs text-muted-foreground">{dateKey}</div>
      {groupIds.map((groupId) => {
        const messages = msgMap[groupId];
        if (!messages?.length) return null;

        return (
          <MessageListItem
            key={groupId}
            messages={messages}
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
        );
      })}
    </>
  );
}

export const MessageListGroup = memo(MessageListGroupComponent) as typeof MessageListGroupComponent;
