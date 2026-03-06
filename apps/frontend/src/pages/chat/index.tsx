import { ChatHeader } from '@frontend/layout/widgets/ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from '@frontend/components/chat/ChatInput';
import { memo, useState } from 'react';
import type { Chat, FriendRequest, TabType } from '@frontend/types/chat';

const mockChats: Chat[] = [
  {
    id: 1,
    name: 'Product 群',
    avatar: 'P',
    lastMessage: '这个方案我觉得可以先上线一版～',
    lastTime: '15:32',
    unread: 3,
    messages: [
      {
        id: 1,
        sender: 'them',
        text: '今天先把新版本的入口灰度给一部分用户吧？',
        time: '15:21',
      },
      {
        id: 2,
        sender: 'me',
        text: '可以，我这边 Electron 客户端也快调通了。',
        time: '15:25',
      },
      {
        id: 3,
        sender: 'them',
        text: '那我先在前端把埋点打好 👌',
        time: '15:32',
      },
    ],
  },
  {
    id: 2,
    name: '设计 – Chat UI',
    avatar: 'D',
    lastMessage: '我再优化一下暗色主题的对比度。',
    lastTime: '昨天',
    messages: [
      {
        id: 1,
        sender: 'them',
        text: '你看下这个类似 Telegram 的布局，还需要加什么？',
        time: '09:12',
      },
      {
        id: 2,
        sender: 'me',
        text: '整体很干净，我们保持左侧列表 + 右侧对话就行。',
        time: '09:18',
      },
    ],
  },
  {
    id: 3,
    name: '自己',
    avatar: '我',
    lastMessage: '记得明天把配置抽成 shared-config 包。',
    lastTime: '周二',
    messages: [
      {
        id: 1,
        sender: 'me',
        text: '记个 todo：把 TypeScript 配置都放到 @c_chat/typescript-config 里统一管理。',
        time: '21:08',
      },
    ],
  },
];

// 模拟好友请求数据
const mockFriendRequests: FriendRequest[] = [
  {
    id: 1,
    fromUser: {
      id: 4,
      username: 'david_zhang',
      nickname: 'David Zhang',
      avatar: 'D',
      signature: 'Mobile Developer',
      status: 'online',
    },
    toUser: {
      id: 1,
      username: 'current_user',
      nickname: 'Current User',
      avatar: 'CU',
      status: 'online',
    },
    status: 'pending',
    createTime: new Date(Date.now() - 3600000).toISOString(), // 1小时前
    message: '你好，看到你在讨论React项目，我也在学习，希望能一起交流！',
  },
  {
    id: 2,
    fromUser: {
      id: 5,
      username: 'emma_li',
      nickname: 'Emma Li',
      avatar: 'E',
      signature: 'UI/UX Designer',
      status: 'away',
    },
    toUser: {
      id: 1,
      username: 'current_user',
      nickname: 'Current User',
      avatar: 'CU',
      status: 'online',
    },
    status: 'pending',
    createTime: new Date(Date.now() - 7200000).toISOString(), // 2小时前
    message: '你的设计作品很棒！希望能互相学习交流～',
  },
];

// 模拟联系人数据
const mockContacts: User[] = [
  {
    id: 1,
    username: 'alice_wang',
    nickname: 'Alice Wang',
    avatar: 'A',
    signature: 'Designer & Developer',
    status: 'online',
  },
  {
    id: 2,
    username: 'bob_chen',
    nickname: 'Bob Chen',
    avatar: 'B',
    signature: 'Frontend Engineer',
    status: 'away',
  },
  {
    id: 3,
    username: 'charlie_liu',
    nickname: 'Charlie Liu',
    avatar: 'C',
    signature: 'Backend Developer',
    status: 'offline',
  },
  {
    id: 4,
    username: 'david_zhang',
    nickname: 'David Zhang',
    avatar: 'D',
    signature: 'Mobile Developer',
    status: 'online',
  },
];

const ChatComponent = () => {
  const [activeTab, setActiveTab] = useState<TabType>('message');
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [activeId, setActiveId] = useState<number>(mockChats[0]?.id ?? 1);
  const [input, setInput] = useState('');
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(mockFriendRequests);
  const [showNotification, setShowNotification] = useState(true);

  const activeChat = chats.find((c) => c.id === activeId);

  const handleSend = () => {
    if (!input.trim() || !activeChat) return;

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              lastMessage: input.trim(),
              lastTime: time,
              messages: [
                ...chat.messages,
                {
                  id: chat.messages.length + 1,
                  sender: 'me',
                  text: input.trim(),
                  time,
                },
              ],
            }
          : chat,
      ),
    );

    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chat={activeChat} />
      <MessageList messages={activeChat.messages} />
      <ChatInput value={input} onChange={setInput} onSend={handleSend} />
    </div>
  );
};

export default memo(ChatComponent);
