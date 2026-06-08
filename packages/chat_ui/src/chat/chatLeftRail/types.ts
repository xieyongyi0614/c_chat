import type { ComponentType, ReactNode } from 'react';

export interface ChatLeftRailNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  unreadCount?: number;
}

export interface ChatLeftRailFilterItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
}

export interface ChatLeftRailAccount {
  id: string;
  title?: string | null;
  avatarUrl?: string | null;
  avatarAlt?: string;
}

export interface ChatLeftRailAccountMenuItem {
  id: string;
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface ChatLeftRailLabels {
  accountMenu?: string;
}

export interface ChatLeftRailProps {
  navItems: ChatLeftRailNavItem[];
  filterItems: ChatLeftRailFilterItem[];
  activeNavId: string;
  activeFilterId: string;
  account: ChatLeftRailAccount;
  onSelectNav: (item: ChatLeftRailNavItem) => void;
  onSelectFilter: (item: ChatLeftRailFilterItem) => void;
  accountMenuItems: ChatLeftRailAccountMenuItem[];
  className?: string;
  labels?: ChatLeftRailLabels;
}

export interface ChatLeftRailNavButtonProps {
  item: ChatLeftRailNavItem;
  active: boolean;
  onSelect: (item: ChatLeftRailNavItem) => void;
}

export interface ChatLeftRailFilterButtonProps {
  item: ChatLeftRailFilterItem;
  active: boolean;
  onSelect: (item: ChatLeftRailFilterItem) => void;
}

export interface ChatLeftRailAccountMenuProps {
  account: ChatLeftRailAccount;
  items: ChatLeftRailAccountMenuItem[];
  labels?: ChatLeftRailLabels;
}
