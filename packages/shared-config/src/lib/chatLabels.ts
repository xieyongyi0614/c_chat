export type ChatLeftRailNavId = 'chats' | 'contacts' | 'saved' | 'settings';
export type ChatConversationFolderId = 'all' | 'unread' | 'personal' | 'groups' | 'archive';

export type ChatLeftRailNavConfig = {
  id: ChatLeftRailNavId;
  label: string;
  path?: string;
};

export type ChatLeftRailFilterConfig = {
  id: ChatConversationFolderId;
  label: string;
};

export const CHAT_LEFT_RAIL_NAV_ITEMS: readonly ChatLeftRailNavConfig[] = [
  { id: 'chats', label: '消息', path: '/chat' },
  { id: 'contacts', label: '联系人' },
  { id: 'saved', label: '收藏' },
  { id: 'settings', label: '设置' },
] as const;

export const CHAT_LEFT_RAIL_FILTER_ITEMS: readonly ChatLeftRailFilterConfig[] = [
  { id: 'all', label: '全部' },
  { id: 'unread', label: '未读' },
  { id: 'personal', label: '私聊' },
  { id: 'groups', label: '群组' },
  { id: 'archive', label: '归档' },
] as const;

export const CHAT_LEFT_RAIL_LABELS = {
  accountMenu: '账户菜单',
} as const;

export const CHAT_ACCOUNT_MENU_LABELS = {
  profile: '账号资料',
  logout: '退出登录',
  loggingOut: '退出中...',
} as const;

export const CHAT_CONVERSATION_SIDEBAR_LABELS = {
  title: '消息',
  searchPlaceholder: '搜索会话...',
  searchLabel: '搜索',
  emptyMessage: '暂无会话',
  noMessage: '暂无消息',
  groupNoMessage: '群聊',
  createConversation: '创建会话',
  createGroup: '创建群聊',
} as const;

export const CHAT_EMPTY_STATE_LABELS = {
  selectConversation: '选择一个会话开始聊天',
} as const;
