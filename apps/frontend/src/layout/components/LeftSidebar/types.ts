export type SidebarProfile = {
  id: string;
  avatarUrl: string;
  nickname: string;
  avatarFilePath?: string;
};

export type ProfileStats = {
  conversations: number;
  unread: number;
  groups: number;
};
