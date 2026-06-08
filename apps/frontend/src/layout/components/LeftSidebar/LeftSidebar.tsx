import { useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { AccountMenu } from './AccountMenu';
import { ProfileDialog } from './ProfileDialog';
import { SidebarFolderButton } from './SidebarFolderButton';
import { SidebarNavButton } from './SidebarNavButton';
import type { ProfileStats, SidebarProfile } from './types';
import { ipc } from '@c_chat/shared-utils';

type NavId = 'chats' | 'contacts' | 'saved' | 'settings';
type FolderId = 'all' | 'unread' | 'personal' | 'groups' | 'archive';

const navItems: Array<{
  id: NavId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path?: string;
}> = [
  { id: 'chats', label: '\u6d88\u606f', icon: MessageCircle, path: '/chat' },
  { id: 'contacts', label: '\u8054\u7cfb\u4eba', icon: UsersRound },
  { id: 'saved', label: '\u6536\u85cf', icon: Bookmark },
  { id: 'settings', label: '\u8bbe\u7f6e', icon: Settings },
];

const folderItems: Array<{
  id: FolderId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: '\u5168\u90e8', icon: Inbox },
  { id: 'unread', label: '\u672a\u8bfb', icon: Bell },
  { id: 'personal', label: '\u79c1\u804a', icon: UserRound },
  { id: 'groups', label: '\u7fa4\u7ec4', icon: Folder },
  { id: 'archive', label: '\u5f52\u6863', icon: Archive },
];

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
    const nickname = userInfo?.nickname || userInfo?.email || '\u672a\u547d\u540d\u8d26\u53f7';
    return {
      id: userInfo?.id || '',
      avatarUrl: userInfo?.avatarUrl || '',
      nickname,
    };
  }, [userInfo?.avatarUrl, userInfo?.email, userInfo?.id, userInfo?.nickname]);

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
      toast.error(error instanceof Error ? error.message : '\u5934\u50cf\u4e0a\u4f20\u5931\u8d25');
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
      toast.success('\u8d26\u53f7\u8d44\u6599\u5df2\u66f4\u65b0');
      setProfileOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '\u8d26\u53f7\u8d44\u6599\u66f4\u65b0\u5931\u8d25',
      );
    } finally {
      setSavingProfile(false);
    }
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
            const active = selectedConversationFolder === item.id;
            const count = folderCounts[item.id];

            return (
              <SidebarFolderButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={active}
                count={count}
                onClick={() => setSelectedConversationFolder(item.id)}
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
        saving={savingProfile}
        onOpenChange={setProfileOpen}
        onDraftChange={setDraftProfile}
        onSelectAvatar={handleSelectAvatar}
        onSave={handleSaveProfile}
      />
    </>
  );
}
