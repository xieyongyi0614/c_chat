'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConversationSidebar } from '@c_chat/ui';
import { Plus } from 'lucide-react';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { authService, conversationService, initializeRealtimeListeners } from '@/lib/services';
import { UserProfileDialog } from './_components/UserProfileDialog';
import { CreateGroupDialog } from './_components/CreateGroupDialog';
import { ChatWindow } from './_components/ChatWindow';
import { MediaLightbox } from './_components/MediaLightbox';
import { AudioPlayerBridge } from './_components/AudioPlayerBridge';
import { ChatUserMenu } from './_components/ChatUserMenu';

const SYNC_INTERVAL_MS = 30_000;

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

  const visibleConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return conversations;
    return conversations.filter((conversation) =>
      conversation.targetName.toLowerCase().includes(keyword),
    );
  }, [conversations, search]);

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

  const userMenu = (
    <ChatUserMenu
      userInfo={userInfo}
      loggingOut={loggingOut}
      onOpenProfile={() => setProfileOpen(true)}
      onLogout={() => {
        void handleLogout();
      }}
    />
  );

  return (
    <main className="flex h-screen bg-background text-foreground">
      <ConversationSidebar
        className="border-r border-border px-4 py-4"
        conversations={visibleConversations}
        selectedConversationId={selectedConversationId}
        search={search}
        onSearchChange={setSearch}
        onSelectConversation={handleSelect}
        loading={loading}
        error={error}
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Create group"
            onClick={() => setCreateGroupOpen(true)}
            className="rounded-lg"
          >
            <Plus className="stroke-muted-foreground" />
          </Button>
        }
        labels={{
          title: 'Messages',
          searchPlaceholder: 'Search conversations...',
          searchLabel: 'Search',
          emptyMessage: 'No conversations',
          noMessage: 'No messages',
          groupNoMessage: 'Group chat',
        }}
      />

      {selectedConversationId ? (
        <ChatWindow
          key={selectedConversationId}
          conversationId={selectedConversationId}
          headerAction={userMenu}
        />
      ) : (
        <section className="relative flex flex-1 items-center justify-center bg-muted/30">
          <div className="absolute top-4 right-4">{userMenu}</div>
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Select a conversation to start chatting</p>
          </div>
        </section>
      )}

      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
      <MediaLightbox />
      <AudioPlayerBridge />
    </main>
  );
}
