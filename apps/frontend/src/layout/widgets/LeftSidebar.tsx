import { useMemo, useState, type ChangeEvent, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  Bell,
  Bookmark,
  Folder,
  Inbox,
  MessageCircle,
  Settings,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Separator } from '@c_chat/ui';
import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import {
  AccountMenu,
  ProfileDialog,
  SidebarFolderButton,
  SidebarNavButton,
  type ProfileStats,
  type SidebarProfile,
} from './LeftSidebarComponents';

type NavId = 'chats' | 'contacts' | 'saved' | 'settings';
type FolderId = 'all' | 'unread' | 'personal' | 'groups' | 'archive';

const navItems: Array<{
  id: NavId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path?: string;
}> = [
  { id: 'chats', label: '消息', icon: MessageCircle, path: '/chat' },
  { id: 'contacts', label: '联系人', icon: UsersRound },
  { id: 'saved', label: '收藏', icon: Bookmark },
  { id: 'settings', label: '设置', icon: Settings },
];

const folderItems: Array<{
  id: FolderId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: '全部', icon: Inbox },
  { id: 'unread', label: '未读', icon: Bell },
  { id: 'personal', label: '私聊', icon: UserRound },
  { id: 'groups', label: '群组', icon: Folder },
  { id: 'archive', label: '归档', icon: Archive },
];

export function LeftSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const logout = useUserStore((state) => state.logout);
  const conversations = useChatStore((state) => state.conversationData.list);

  const [activeFolder, setActiveFolder] = useState<FolderId>('all');
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftProfile, setDraftProfile] = useState<SidebarProfile>({
    avatarUrl: '',
    nickname: '',
  });

  const displayProfile = useMemo<SidebarProfile>(() => {
    const nickname = userInfo?.nickname || userInfo?.email || '未命名账号';
    return {
      avatarUrl: userInfo?.avatarUrl || '',
      nickname,
    };
  }, [userInfo?.avatarUrl, userInfo?.email, userInfo?.nickname]);

  const activeNavId: NavId = location.pathname.startsWith('/chat') ? 'chats' : 'chats';
  const unreadCount = conversations.reduce((total, item) => total + (item.unreadCount ?? 0), 0);
  const groupCount = conversations.filter((item) => item.type === 2).length;
  const personalCount = conversations.length - groupCount;

  const folderCounts: Record<FolderId, number> = {
    all: conversations.length,
    unread: unreadCount,
    personal: personalCount,
    groups: groupCount,
    archive: 0,
  };

  const handleNavClick = (id: NavId, path?: string) => {
    if (path) {
      navigate(path);
      return;
    }
    setActiveFolder(id === 'contacts' ? 'personal' : 'all');
  };

  const handleOpenProfile = () => {
    setDraftProfile(displayProfile);
    setProfileOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/sign-in', { replace: true });
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDraftProfile((profile) => ({
        ...profile,
        avatarUrl: String(reader.result ?? profile.avatarUrl),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    const nextProfile = {
      avatarUrl: draftProfile.avatarUrl.trim(),
      nickname: draftProfile.nickname.trim() || displayProfile.nickname,
    };

    if (userInfo) {
      setUserInfo({
        ...userInfo,
        nickname: nextProfile.nickname,
        avatarUrl: nextProfile.avatarUrl || userInfo.avatarUrl,
      });
    }

    setProfileOpen(false);
  };

  const profileStats: ProfileStats = {
    conversations: conversations.length,
    unread: unreadCount,
    groups: groupCount,
  };

  return (
    <>
      <aside className="flex h-full w-[84px] shrink-0 flex-col border-r bg-background/95 text-foreground">
        <div className="flex flex-col items-center gap-2 px-3 py-4">
          <div className="flex flex-col items-center gap-1.5">
            {navItems.map((item) => {
              const active = activeNavId === item.id;

              return (
                <SidebarNavButton
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  unreadCount={item.id === 'chats' ? unreadCount : undefined}
                  onClick={() => handleNavClick(item.id, item.path)}
                />
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-4">
          {folderItems.map((item) => {
            const active = activeFolder === item.id;
            const count = folderCounts[item.id];

            return (
              <SidebarFolderButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={active}
                count={count}
                onClick={() => setActiveFolder(item.id)}
              />
            );
          })}
        </div>

        <div className="border-t px-3 py-3">
          <AccountMenu
            profile={displayProfile}
            onOpenProfile={handleOpenProfile}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      <ProfileDialog
        open={profileOpen}
        profile={displayProfile}
        draftProfile={draftProfile}
        email={userInfo?.email}
        stats={profileStats}
        onOpenChange={setProfileOpen}
        onDraftChange={setDraftProfile}
        onAvatarFileChange={handleAvatarFileChange}
        onSave={handleSaveProfile}
      />
    </>
  );
}
