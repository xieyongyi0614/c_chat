import type { ReactNode } from 'react';

export interface ChatGroupInfo {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  notice?: string | null;
  ownerId?: string | null;
  createTimeLabel?: ReactNode;
}

export interface ChatGroupMember {
  userId?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  role?: number | null;
  alias?: string | null;
}

export interface ChatGroupInviteUser {
  id: string;
  email?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface ChatGroupDraft {
  name: string;
  avatarUrl: string;
  notice: string;
}

export interface ChatGroupDetailLabels {
  title?: ReactNode;
  description?: ReactNode;
  loading?: ReactNode;
  retry?: ReactNode;
  notFound?: ReactNode;
  fallbackName?: ReactNode;
  noNotice?: ReactNode;
  members?: ReactNode;
  loadingShort?: ReactNode;
  emptyMembers?: ReactNode;
  owner?: ReactNode;
  edit?: ReactNode;
  invite?: ReactNode;
  leave?: ReactNode;
  dismiss?: ReactNode;
  dismissTitle?: ReactNode;
  dismissDescription?: ReactNode;
  dismissConfirm?: ReactNode;
  leaveTitle?: ReactNode;
  leaveDescription?: ReactNode;
  leaveConfirm?: ReactNode;
  cancel?: ReactNode;
  save?: ReactNode;
  saving?: ReactNode;
  namePlaceholder?: string;
  avatarPlaceholder?: string;
  selectAvatar?: string;
  noticePlaceholder?: string;
}

export interface ChatGroupInviteLabels {
  title?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  empty?: ReactNode;
  selected?: ReactNode;
  cancel?: ReactNode;
  invite?: ReactNode;
  inviting?: ReactNode;
}
