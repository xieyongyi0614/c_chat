export type Message = {
  id: number;
  sender: 'me' | 'them';
  text: string;
  time: string;
};

export type Chat = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread?: number;
  messages: Message[];
};

// 添加好友相关类型
export type User = {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  signature?: string;
  status: 'online' | 'offline' | 'away';
};

export type FriendRequest = {
  id: number;
  fromUser: User;
  toUser: User;
  status: 'pending' | 'accepted' | 'rejected';
  createTime: string;
  message?: string;
};

export type AddFriendFormData = {
  searchQuery: string;
  addMessage: string;
};

export type TabType = 'message' | 'contacts' | 'favorites' | 'settings';
