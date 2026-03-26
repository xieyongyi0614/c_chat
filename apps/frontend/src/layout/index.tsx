import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import type {
  Chat,
  FriendRequest,
  User,
  TabType,
  AddFriendFormData,
} from '@c_chat/frontend/types/chat';
import { LeftSidebar } from './widgets/LeftSidebar';
import { ContactsPanel } from './widgets/ContactsPanel';
import { AddFriendModal } from '@c_chat/frontend/components/modal/AddFriendModal';
import { FriendRequestNotification } from '@c_chat/frontend/components/notification/FriendRequestNotification';

const mockChats: Chat[] = [];

const mockFriendRequests: FriendRequest[] = [];

const mockContacts: User[] = [];

const Layout: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('message');
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [activeId, setActiveId] = useState<number>(mockChats[0]?.id ?? 1);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(mockFriendRequests);
  const [showNotification, setShowNotification] = useState(true);

  const activeChat = chats.find((c) => c.id === activeId);

  const handleAddFriend = (formData: AddFriendFormData) => {
    console.log('添加好友请求:', formData);
    alert(`已向用户发送好友申请：${formData.addMessage}`);
  };

  const handleAcceptRequest = (requestId: number) => {
    setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    console.log('接受好友请求:', requestId);
  };

  const handleRejectRequest = (requestId: number) => {
    setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    console.log('拒绝好友请求:', requestId);
  };

  const handleContactSelect = (contact: User) => {
    console.log('选择联系人:', contact);
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800 text-surface-50">
      {/* 左侧操作栏 */}
      <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 中间面板 - 根据选中的标签显示不同内容 */}
      {/* {activeTab === 'message' && (
        <Sidebar chats={chats} activeId={activeId} onSelectChat={setActiveId} />
      )} */}

      {activeTab === 'contacts' && (
        <ContactsPanel
          contacts={mockContacts}
          friendRequests={friendRequests}
          onAddFriendClick={() => setIsAddFriendModalOpen(true)}
          onContactSelect={handleContactSelect}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
        />
      )}

      {/* 右侧聊天区域 - 路由出口 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>

      {/* 弹窗和通知组件 */}
      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onAddFriend={handleAddFriend}
      />

      {showNotification && (
        <FriendRequestNotification
          requests={friendRequests}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onClose={handleCloseNotification}
        />
      )}
    </div>
  );
};

export default Layout;
