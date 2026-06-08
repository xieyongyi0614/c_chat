'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  ChatEmptyConversationState,
  ChatLeftRail,
  ConversationSidebar,
  type ChatLeftRailFilterItem,
  type ChatLeftRailNavItem,
} from '@c_chat/ui';
import {
  CHAT_ACCOUNT_MENU_LABELS,
  CHAT_CONVERSATION_SIDEBAR_LABELS,
  CHAT_EMPTY_STATE_LABELS,
  CHAT_LEFT_RAIL_FILTER_ITEMS,
  CHAT_LEFT_RAIL_NAV_ITEMS,
  type ChatConversationFolderId,
  type ChatLeftRailNavId,
} from '@c_chat/shared-config';
import {
  Archive,
  Bell,
  Bookmark,
  Folder,
  Inbox,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  UserCircle,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { ConversationType, type LocalConversationListItem } from '@c_chat/shared-types';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { authService, conversationService, initializeRealtimeListeners } from '@/lib/services';
import { formatFileUrl } from '@/lib/media/formatFileUrl';
import { UserProfileDialog } from './_components/UserProfileDialog';
import { CreateGroupDialog } from './_components/CreateGroupDialog';
import { ChatWindow } from './_components/ChatWindow';
import { MediaLightbox } from './_components/MediaLightbox';
import { AudioPlayerBridge } from './_components/AudioPlayerBridge';

const SYNC_INTERVAL_MS = 30_000;

const navIcons: Record<ChatLeftRailNavId, ChatLeftRailNavItem['icon']> = {
  chats: MessageCircle,
  contacts: UsersRound,
  saved: Bookmark,
  settings: Settings,
};

const folderIcons: Record<ChatConversationFolderId, ChatLeftRailFilterItem['icon']> = {
  all: Inbox,
  unread: Bell,
  personal: UserRound,
  groups: Folder,
  archive: Archive,
};

export default function ChatsPage() {
  const router = useRouter();
  const userInfo = useUserStore((state) => state.userInfo);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearUser = useUserStore((state) => state.clearUser);

  const conversations = useConversationStore((state) => state.conversations);
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId);
  const loading = useConversationStore((state) => state.loading);
  const error = useConversationStore((state) => state.error);
  const setConversations = useConversationStore((state) => state.setConversations);
  const setLoading = useConversationStore((state) => state.setLoading);
  const setError = useConversationStore((state) => state.setError);
  const selectConversation = useConversationStore((state) => state.selectConversation);
  const clearUnread = useConversationStore((state) => state.clearUnread);

  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(!isAuthenticated);
  const [selectedConversationFolder, setSelectedConversationFolder] =
    useState<ChatConversationFolderId>('all');

  const visibleConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (selectedConversationFolder === 'unread' && (conversation.unreadCount ?? 0) <= 0) {
        return false;
      }
      if (
        selectedConversationFolder === 'personal' &&
        conversation.type !== ConversationType.Single
      ) {
        return false;
      }
      if (selectedConversationFolder === 'groups' && conversation.type !== ConversationType.Group) {
        return false;
      }
      if (selectedConversationFolder === 'archive') {
        return false;
      }
      if (!keyword) return true;
      return conversation.targetName.toLowerCase().includes(keyword);
    });
  }, [conversations, search, selectedConversationFolder]);
  useEffect(() => {
    if (isAuthenticated) {
      setCheckingAuth(false);
      return;
    }

    let disposed = false;

    const restoreSession = async () => {
      try {
        const restoredUserInfo = await authService.autoSignIn();
        if (disposed) return;
        useUserStore.getState().setUserInfo(restoredUserInfo);
        initializeRealtimeListeners();
      } catch {
        if (!disposed) {
          router.push('/auth/signin');
        }
      } finally {
        if (!disposed) {
          setCheckingAuth(false);
        }
      }
    };

    void restoreSession();

    return () => {
      disposed = true;
    };
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    initializeRealtimeListeners();

    const sync = () => {
      conversationService.getConversationList().catch((err) => {
        console.error('Failed to sync conversations:', err);
      });
    };

    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      try {
        const local = await conversationService.getLocalConversationList();
        setConversations(local);
        await conversationService.getConversationList();
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    void initialLoad();

    const intervalId = setInterval(sync, SYNC_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, router, setConversations, setLoading, setError]);

  const handleSelect = (conversation: LocalConversationListItem) => {
    selectConversation(conversation.id);
    if ((conversation.unreadCount ?? 0) > 0) clearUnread(conversation.id);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
      clearUser();
      router.push('/auth/signin');
    } catch (err) {
      console.error('Logout failed:', err);
      setLoggingOut(false);
    }
  };

  if (checkingAuth || !isAuthenticated) {
    return null;
  }

  const unreadCount = conversations.reduce((total, item) => total + (item.unreadCount ?? 0), 0);
  const groupCount = conversations.filter((item) => item.type === ConversationType.Group).length;
  const personalCount = conversations.length - groupCount;
  const filterCounts: Record<ChatConversationFolderId, number> = {
    all: conversations.length,
    unread: unreadCount,
    personal: personalCount,
    groups: groupCount,
    archive: 0,
  };

  return (
    <main className="flex h-screen bg-background text-foreground">
      <ChatLeftRail
        navItems={CHAT_LEFT_RAIL_NAV_ITEMS.map((item) => ({
          ...item,
          icon: navIcons[item.id],
          unreadCount: item.id === 'chats' ? unreadCount : undefined,
        }))}
        filterItems={CHAT_LEFT_RAIL_FILTER_ITEMS.map((item) => ({
          ...item,
          icon: folderIcons[item.id],
          count: filterCounts[item.id],
        }))}
        activeNavId="chats"
        activeFilterId={selectedConversationFolder}
        account={{
          id: userInfo?.id ?? '',
          title: userInfo?.nickname || userInfo?.email,
          avatarUrl: formatFileUrl(userInfo?.avatarUrl),
          avatarAlt: userInfo?.nickname || userInfo?.email,
        }}
        onSelectNav={(item) => {
          if (item.id === 'contacts') setSelectedConversationFolder('personal');
          if (item.id !== 'contacts') setSelectedConversationFolder('all');
        }}
        onSelectFilter={(item) => {
          const nextFolder = CHAT_LEFT_RAIL_FILTER_ITEMS.find(
            (candidate) => candidate.id === item.id,
          );
          if (nextFolder) setSelectedConversationFolder(nextFolder.id);
        }}
        accountMenuItems={[
          {
            id: 'profile',
            label: CHAT_ACCOUNT_MENU_LABELS.profile,
            icon: UserCircle,
            onSelect: () => setProfileOpen(true),
          },
          {
            id: 'logout',
            label: loggingOut
              ? CHAT_ACCOUNT_MENU_LABELS.loggingOut
              : CHAT_ACCOUNT_MENU_LABELS.logout,
            icon: LogOut,
            destructive: true,
            disabled: loggingOut,
            onSelect: () => {
              void handleLogout();
            },
          },
        ]}
      />

      <ConversationSidebar
        className="border-r border-border px-4 py-4"
        conversations={visibleConversations}
        selectedConversationId={selectedConversationId}
        search={search}
        onSearchChange={setSearch}
        onSelectConversation={handleSelect}
        formatAvatarUrl={formatFileUrl}
        loading={loading}
        error={error}
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={CHAT_CONVERSATION_SIDEBAR_LABELS.createGroup}
            onClick={() => setCreateGroupOpen(true)}
            className="rounded-lg"
          >
            <Plus className="stroke-muted-foreground" />
          </Button>
        }
        labels={{
          title: CHAT_CONVERSATION_SIDEBAR_LABELS.title,
          searchPlaceholder: CHAT_CONVERSATION_SIDEBAR_LABELS.searchPlaceholder,
          searchLabel: CHAT_CONVERSATION_SIDEBAR_LABELS.searchLabel,
          emptyMessage: CHAT_CONVERSATION_SIDEBAR_LABELS.emptyMessage,
          noMessage: CHAT_CONVERSATION_SIDEBAR_LABELS.noMessage,
          groupNoMessage: CHAT_CONVERSATION_SIDEBAR_LABELS.groupNoMessage,
        }}
      />

      {selectedConversationId ? (
        <ChatWindow key={selectedConversationId} conversationId={selectedConversationId} />
      ) : (
        <ChatEmptyConversationState
          title={CHAT_EMPTY_STATE_LABELS.selectConversation}
          className="relative bg-muted/30"
        />
      )}

      <UserProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        stats={{
          conversations: conversations.length,
          unread: unreadCount,
          groups: groupCount,
        }}
      />
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
      <MediaLightbox />
      <AudioPlayerBridge />
    </main>
  );
}
