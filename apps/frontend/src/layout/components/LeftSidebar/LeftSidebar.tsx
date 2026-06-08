import { useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive,
  Bell,
  Bookmark,
  Folder,
  Inbox,
  LogOut,
  MessageCircle,
  Settings,
  UserCircle,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  ChatLeftRail,
  ChatProfileDialog,
  type ChatLeftRailFilterItem,
  type ChatLeftRailNavItem,
} from '@c_chat/ui';
import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type { SidebarProfile } from './types';
import { ipc } from '@c_chat/shared-utils';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import {
  CHAT_ACCOUNT_MENU_LABELS,
  CHAT_LEFT_RAIL_FILTER_ITEMS,
  CHAT_LEFT_RAIL_LABELS,
  CHAT_LEFT_RAIL_NAV_ITEMS,
  type ChatConversationFolderId,
  type ChatLeftRailNavId,
} from '@c_chat/shared-config';

const navIcons: Record<ChatLeftRailNavId, ComponentType<{ className?: string }>> = {
  chats: MessageCircle,
  contacts: UsersRound,
  saved: Bookmark,
  settings: Settings,
};

const folderIcons: Record<ChatConversationFolderId, ComponentType<{ className?: string }>> = {
  all: Inbox,
  unread: Bell,
  personal: UserRound,
  groups: Folder,
  archive: Archive,
};

export function LeftSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = useUserStore((state) => state.userInfo);
  const updateUserProfile = useUserStore((state) => state.updateUserProfile);
  const logout = useUserStore((state) => state.logout);
  const conversations = useChatStore((state) => state.conversationData.list);
  const selectedConversationFolder = useChatStore((state) => state.selectedConversationFolder);
  const setSelectedConversationFolder = useChatStore(
    (state) => state.setSelectedConversationFolder,
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState<SidebarProfile>({
    id: '',
    avatarUrl: '',
    nickname: '',
  });

  const displayProfile = useMemo<SidebarProfile>(() => {
    const nickname = userInfo?.nickname || userInfo?.email || '未命名账号';
    return {
      id: userInfo?.id || '',
      avatarUrl: userInfo?.avatarUrl || '',
      nickname,
    };
  }, [userInfo?.avatarUrl, userInfo?.email, userInfo?.id, userInfo?.nickname]);

  const activeNavId: ChatLeftRailNavId = location.pathname.startsWith('/chat') ? 'chats' : 'chats';
  const unreadCount = conversations.reduce((total, item) => total + (item.unreadCount ?? 0), 0);
  const groupCount = conversations.filter((item) => item.type === 2).length;
  const personalCount = conversations.length - groupCount;

  const folderCounts: Record<ChatConversationFolderId, number> = {
    all: conversations.length,
    unread: unreadCount,
    personal: personalCount,
    groups: groupCount,
    archive: 0,
  };

  const handleNavClick = (id: ChatLeftRailNavId, path?: string) => {
    if (path) {
      navigate(path);
      return;
    }
    setSelectedConversationFolder(id === 'contacts' ? 'personal' : 'all');
  };

  const handleOpenProfile = () => {
    setDraftProfile(displayProfile);
    setProfileOpen(true);
  };

  const handleSelectAvatar = async () => {
    const files = await ipc.SelectFiles({
      allowMultiSelect: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });
    const file = files?.[0];
    if (!file) return;

    setSavingProfile(true);
    try {
      const updated = await updateUserProfile({ avatarFilePath: file.filePath });
      setDraftProfile((profile) => ({
        ...profile,
        avatarUrl: updated?.avatarUrl ?? file.url ?? profile.avatarUrl,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/sign-in', { replace: true });
  };

  const handleSaveProfile = async () => {
    const nextProfile = {
      nickname: draftProfile.nickname.trim() || displayProfile.nickname,
    };

    try {
      setSavingProfile(true);
      await updateUserProfile(nextProfile);
      toast.success('账号资料已更新');
      setProfileOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '账号资料更新失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarPreview = (avatarUrl: string) => {
    void ipc.OpenMediaPreview({
      items: [
        {
          id: draftProfile.id || 'profile-avatar',
          type: 'image',
          fileUrl: avatarUrl,
          fileName: displayProfile.nickname,
          createTime: Date.now(),
          senderId: draftProfile.id,
        },
      ],
      initialIndex: 0,
    });
  };

  const railNavItems: ChatLeftRailNavItem[] = CHAT_LEFT_RAIL_NAV_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: navIcons[item.id],
    unreadCount: item.id === 'chats' ? unreadCount : undefined,
  }));

  const railFilterItems: ChatLeftRailFilterItem[] = CHAT_LEFT_RAIL_FILTER_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: folderIcons[item.id],
    count: folderCounts[item.id],
  }));

  return (
    <>
      <ChatLeftRail
        navItems={railNavItems}
        filterItems={railFilterItems}
        activeNavId={activeNavId}
        activeFilterId={selectedConversationFolder}
        account={{
          id: displayProfile.id,
          title: displayProfile.nickname,
          avatarUrl: formatFileUrl(displayProfile.avatarUrl),
          avatarAlt: displayProfile.nickname,
        }}
        onSelectNav={(item) => {
          const navItem = CHAT_LEFT_RAIL_NAV_ITEMS.find((candidate) => candidate.id === item.id);
          if (navItem) handleNavClick(navItem.id, navItem.path);
        }}
        onSelectFilter={(item) => {
          const folderItem = CHAT_LEFT_RAIL_FILTER_ITEMS.find(
            (candidate) => candidate.id === item.id,
          );
          if (folderItem) setSelectedConversationFolder(folderItem.id);
        }}
        accountMenuItems={[
          {
            id: 'profile',
            label: CHAT_ACCOUNT_MENU_LABELS.profile,
            icon: UserCircle,
            onSelect: handleOpenProfile,
          },
          {
            id: 'logout',
            label: CHAT_ACCOUNT_MENU_LABELS.logout,
            icon: LogOut,
            destructive: true,
            onSelect: handleLogout,
          },
        ]}
        labels={CHAT_LEFT_RAIL_LABELS}
      />

      <ChatProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={{
          id: draftProfile.id,
          nickname: displayProfile.nickname,
          avatarUrl: formatFileUrl(draftProfile.avatarUrl),
        }}
        draftNickname={draftProfile.nickname}
        email={userInfo?.email}
        stats={[
          { id: 'conversations', label: '会话', value: conversations.length },
          { id: 'unread', label: '未读', value: unreadCount },
          { id: 'groups', label: '群组', value: groupCount },
        ]}
        saving={savingProfile}
        onNicknameChange={(nickname) => setDraftProfile((p) => ({ ...p, nickname }))}
        onAvatarPreview={handleAvatarPreview}
        onSelectAvatar={handleSelectAvatar}
        onSave={handleSaveProfile}
      />
    </>
  );
}
