// import { useState } from 'react';
// import type { Chat, AddFriendFormData, FriendRequest, User, TabType } from './types/chat';
// import { LeftSidebar } from './components/layout/LeftSidebar';
// import { ContactsPanel } from './components/layout/ContactsPanel';
// import { Sidebar } from './components/layout/Sidebar';
// import { ChatHeader } from './components/layout/ChatHeader';
// import { MessageList } from './page/chat/MessageList';
// import { ChatInput } from './components/chat/ChatInput';
// import { AddFriendModal } from './components/modal/AddFriendModal';
// import { FriendRequestNotification } from './components/notification/FriendRequestNotification';

// const mockChats: Chat[] = [
//   {
//     id: 1,
//     name: 'Product 群',
//     avatar: 'P',
//     lastMessage: '这个方案我觉得可以先上线一版～',
//     lastTime: '15:32',
//     unread: 3,
//     messages: [
//       {
//         id: 1,
//         sender: 'them',
//         text: '今天先把新版本的入口灰度给一部分用户吧？',
//         time: '15:21',
//       },
//       {
//         id: 2,
//         sender: 'me',
//         text: '可以，我这边 Electron 客户端也快调通了。',
//         time: '15:25',
//       },
//       {
//         id: 3,
//         sender: 'them',
//         text: '那我先在前端把埋点打好 👌',
//         time: '15:32',
//       },
//     ],
//   },
//   {
//     id: 2,
//     name: '设计 – Chat UI',
//     avatar: 'D',
//     lastMessage: '我再优化一下暗色主题的对比度。',
//     lastTime: '昨天',
//     messages: [
//       {
//         id: 1,
//         sender: 'them',
//         text: '你看下这个类似 Telegram 的布局，还需要加什么？',
//         time: '09:12',
//       },
//       {
//         id: 2,
//         sender: 'me',
//         text: '整体很干净，我们保持左侧列表 + 右侧对话就行。',
//         time: '09:18',
//       },
//     ],
//   },
//   {
//     id: 3,
//     name: '自己',
//     avatar: '我',
//     lastMessage: '记得明天把配置抽成 shared-config 包。',
//     lastTime: '周二',
//     messages: [
//       {
//         id: 1,
//         sender: 'me',
//         text: '记个 todo：把 TypeScript 配置都放到 @c_chat/typescript-config 里统一管理。',
//         time: '21:08',
//       },
//     ],
//   },
// ];

// // 模拟好友请求数据
// const mockFriendRequests: FriendRequest[] = [
//   {
//     id: 1,
//     fromUser: {
//       id: 4,
//       username: 'david_zhang',
//       nickname: 'David Zhang',
//       avatar: 'D',
//       signature: 'Mobile Developer',
//       status: 'online',
//     },
//     toUser: {
//       id: 1,
//       username: 'current_user',
//       nickname: 'Current User',
//       avatar: 'CU',
//       status: 'online',
//     },
//     status: 'pending',
//     createTime: new Date(Date.now() - 3600000).toISOString(), // 1小时前
//     message: '你好，看到你在讨论React项目，我也在学习，希望能一起交流！',
//   },
//   {
//     id: 2,
//     fromUser: {
//       id: 5,
//       username: 'emma_li',
//       nickname: 'Emma Li',
//       avatar: 'E',
//       signature: 'UI/UX Designer',
//       status: 'away',
//     },
//     toUser: {
//       id: 1,
//       username: 'current_user',
//       nickname: 'Current User',
//       avatar: 'CU',
//       status: 'online',
//     },
//     status: 'pending',
//     createTime: new Date(Date.now() - 7200000).toISOString(), // 2小时前
//     message: '你的设计作品很棒！希望能互相学习交流～',
//   },
// ];

// // 模拟联系人数据
// const mockContacts: User[] = [
//   {
//     id: 1,
//     username: 'alice_wang',
//     nickname: 'Alice Wang',
//     avatar: 'A',
//     signature: 'Designer & Developer',
//     status: 'online',
//   },
//   {
//     id: 2,
//     username: 'bob_chen',
//     nickname: 'Bob Chen',
//     avatar: 'B',
//     signature: 'Frontend Engineer',
//     status: 'away',
//   },
//   {
//     id: 3,
//     username: 'charlie_liu',
//     nickname: 'Charlie Liu',
//     avatar: 'C',
//     signature: 'Backend Developer',
//     status: 'offline',
//   },
//   {
//     id: 4,
//     username: 'david_zhang',
//     nickname: 'David Zhang',
//     avatar: 'D',
//     signature: 'Mobile Developer',
//     status: 'online',
//   },
// ];

// function App() {
//   const [activeTab, setActiveTab] = useState<TabType>('message');
//   const [chats, setChats] = useState<Chat[]>(mockChats);
//   const [activeId, setActiveId] = useState<number>(mockChats[0]?.id ?? 1);
//   const [input, setInput] = useState('');
//   const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
//   const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(mockFriendRequests);
//   const [showNotification, setShowNotification] = useState(true);

//   const activeChat = chats.find((c) => c.id === activeId);

//   const handleSend = () => {
//     if (!input.trim() || !activeChat) return;

//     const now = new Date();
//     const time = now.toTimeString().slice(0, 5);

//     setChats((prev) =>
//       prev.map((chat) =>
//         chat.id === activeChat.id
//           ? {
//               ...chat,
//               lastMessage: input.trim(),
//               lastTime: time,
//               messages: [
//                 ...chat.messages,
//                 {
//                   id: chat.messages.length + 1,
//                   sender: 'me',
//                   text: input.trim(),
//                   time,
//                 },
//               ],
//             }
//           : chat,
//       ),
//     );

//     setInput('');
//   };

//   const handleAddFriend = (formData: AddFriendFormData) => {
//     console.log('添加好友请求:', formData);
//     alert(`已向用户发送好友申请：${formData.addMessage}`);
//   };

//   const handleAcceptRequest = (requestId: number) => {
//     setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
//     console.log('接受好友请求:', requestId);
//   };

//   const handleRejectRequest = (requestId: number) => {
//     setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
//     console.log('拒绝好友请求:', requestId);
//   };

//   const handleContactSelect = (contact: User) => {
//     console.log('选择联系人:', contact);
//   };

//   const handleCloseNotification = () => {
//     setShowNotification(false);
//   };

//   return (
//     <div className="flex h-screen max-h-screen overflow-hidden bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800 text-surface-50">
//       {/* 左侧操作栏 */}
//       <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />

//       {/* 中间面板 - 根据选中的标签显示不同内容 */}
//       {activeTab === 'message' && (
//         <Sidebar chats={chats} activeId={activeId} onSelectChat={setActiveId} />
//       )}

//       {activeTab === 'contacts' && (
//         <ContactsPanel
//           contacts={mockContacts}
//           friendRequests={friendRequests}
//           onAddFriendClick={() => setIsAddFriendModalOpen(true)}
//           onContactSelect={handleContactSelect}
//           onAcceptRequest={handleAcceptRequest}
//           onRejectRequest={handleRejectRequest}
//         />
//       )}

//       {/* 右侧聊天区域 */}
//       <main className="flex flex-1 flex-col">
//         {activeTab === 'message' && activeChat ? (
//           <>
//             <ChatHeader chat={activeChat} />
//             <MessageList messages={activeChat.messages} />
//             <ChatInput value={input} onChange={setInput} onSend={handleSend} />
//           </>
//         ) : activeTab === 'message' ? (
//           <div className="flex flex-1 flex-col items-center justify-center gap-2 text-surface-300">
//             <h2 className="text-xl font-semibold text-surface-50">欢迎使用 c-chat</h2>
//             <p className="text-sm">从左侧选择一个会话开始聊天吧。</p>
//           </div>
//         ) : activeTab === 'contacts' ? (
//           <div className="flex flex-1 flex-col items-center justify-center gap-2 text-surface-300">
//             <h2 className="text-xl font-semibold text-surface-50">通讯录</h2>
//             <p className="text-sm">选择一个联系人开始聊天</p>
//           </div>
//         ) : (
//           <div className="flex flex-1 flex-col items-center justify-center gap-2 text-surface-300">
//             <h2 className="text-xl font-semibold text-surface-50">
//               {activeTab === 'favorites' ? '收藏' : '设置'}
//             </h2>
//             <p className="text-sm">功能开发中...</p>
//           </div>
//         )}
//       </main>

//       {/* 弹窗和通知组件 */}
//       <AddFriendModal
//         isOpen={isAddFriendModalOpen}
//         onClose={() => setIsAddFriendModalOpen(false)}
//         onAddFriend={handleAddFriend}
//       />

//       {showNotification && (
//         <FriendRequestNotification
//           requests={friendRequests}
//           onAccept={handleAcceptRequest}
//           onReject={handleRejectRequest}
//           onClose={handleCloseNotification}
//         />
//       )}
//     </div>
//   );
// }

// export default App;

import AppRouter from './router';
import { TitleBar } from './components/system/TitleBar';
import { useEffect } from 'react';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { toast, Toaster } from 'sonner';
const App = () => {
  // const init = useAuthStore((s) => s.init);
  // const status = useAuthStore((s) => s.status);

  // React.useEffect(() => {
  //   if (status === 'unknown') init();
  // }, [init, status]);
  useEffect(() => {
    window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.Toast, (type, message) => {
      console.log(type, message, 'Toast data');
      const toastFn = toast[type as keyof typeof toast];
      if (typeof toastFn === 'function') {
        // const options: ExternalToast = {
        //   duration: type === 'loading' ? 5000 : 30000,
        //   style: { top: '30px' },
        // };
        toastFn(message as any);
      } else {
        console.warn(`未知type: ${type}, 使用默认`);
        toast(message);
      }
    });
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden h-screen">
      <TitleBar />
      <div className="flex flex-1 mt-10 overflow-hidden">
        <AppRouter />
      </div>
      <Toaster position="top-center" style={{ top: '45px' }} duration={3000} />
    </div>
  );
};

export default App;
