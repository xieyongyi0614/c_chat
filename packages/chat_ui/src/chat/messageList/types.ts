import type { ReactNode } from 'react';
import type { ChatMessageAudioControls, ChatMessageFileResolver } from '../chatMessage';
import type { ChatMessageMediaItem } from '../chatMessage/_components/msgTypes/types';

export interface ChatMessageSenderProfile {
  id: string;
  nickname?: string;
  avatarUrl?: string;
  email?: string;
}

export interface ChatMessageListItem extends ChatMessageMediaItem {
  senderId: string;
  senderNickname?: string;
  senderAvatar?: string;
  senderEmail?: string;
}

export interface ChatMessageHistoryState {
  isLoadingLatest: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
}

export interface ChatMessageOpenPreviewPayload<TMessage extends ChatMessageListItem> {
  message: TMessage;
  groupMessages: TMessage[];
  initialIndex: number;
}

export interface ChatAvatarPreviewPayload {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface ChatMessageRetryPayload<TMessage extends ChatMessageListItem> {
  messages: TMessage[];
}

export interface ChatMessageListLabels {
  profileTitle?: string;
  ownBadge?: string;
  unknownSender?: string;
  empty?: ReactNode;
}

export interface ChatMessageAudioControlsSlotProps<TMessage extends ChatMessageListItem> {
  message: TMessage;
  isMe: boolean;
  children: (audioControls: ChatMessageAudioControls | undefined) => ReactNode;
}

export interface ChatMessageListProps<TMessage extends ChatMessageListItem> {
  conversationKey: string | null | undefined;
  dateKeys: string[];
  groups: Map<string, string[]> | Record<string, string[]>;
  msgMap: Record<string, TMessage[]>;
  currentUser?: ChatMessageSenderProfile | null;
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, ChatMessageSenderProfile>;
  historyState: ChatMessageHistoryState;
  loadOlderMessages: () => Promise<boolean>;
  fileResolver: ChatMessageFileResolver;
  className?: string;
  isRead?: boolean;
  labels?: ChatMessageListLabels;
  AudioControlsSlot?: (props: ChatMessageAudioControlsSlotProps<TMessage>) => ReactNode;
  onRetryMessages?: (payload: ChatMessageRetryPayload<TMessage>) => void | Promise<void>;
  onOpenPreview?: (payload: ChatMessageOpenPreviewPayload<TMessage>) => void;
  onAvatarPreview?: (payload: ChatAvatarPreviewPayload) => void;
}
