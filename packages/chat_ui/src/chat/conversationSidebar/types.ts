import type { ReactNode } from 'react';
import type { LocalConversationListItem } from '@c_chat/shared-types';

export interface ConversationSidebarLabels {
  title?: ReactNode;
  searchPlaceholder?: string;
  searchLabel?: string;
  avatarAlt?: string;
  unnamedConversation?: ReactNode;
  emptyMessage?: ReactNode;
  loadingMessage?: ReactNode;
  noMessage?: ReactNode;
  groupNoMessage?: ReactNode;
}

export interface ConversationSidebarProps {
  conversations: LocalConversationListItem[];
  selectedConversationId?: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (conversation: LocalConversationListItem) => void;
  headerAction?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  labels?: ConversationSidebarLabels;
  className?: string;
}

export interface ConversationSidebarItemProps {
  conversation: LocalConversationListItem;
  selected: boolean;
  onSelect: (conversation: LocalConversationListItem) => void;
  labels?: ConversationSidebarLabels;
}
