'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Spinner,
} from '@c_chat/ui';
import { Plus } from 'lucide-react';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore, selectVisibleConversations } from '@/lib/stores/conversation.store';
import { authService, conversationService, initializeRealtimeListeners } from '@/lib/services';
import { ConversationItem } from './_components/ConversationItem';
import { ConversationFolders } from './_components/ConversationFolders';
import { UserProfileDialog } from './_components/UserProfileDialog';
import { CreateGroupDialog } from './_components/CreateGroupDialog';
import { ChatWindow } from './_components/ChatWindow';
import { MediaLightbox } from './_components/MediaLightbox';
import { AudioPlayerBridge } from './_components/AudioPlayerBridge';

const SYNC_INTERVAL_MS = 30_000;

export default function ChatsPage() {
  const router = useRouter();
  const userInfo = useUserStore((state) => state.userInfo);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearUser = useUserStore((state) => state.clearUser);

  const visibleConversations = useConversationStore(selectVisibleConversations);
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId);
  const folder = useConversationStore((state) => state.folder);
  const loading = useConversationStore((state) => state.loading);
  const error = useConversationStore((state) => state.error);
  const setConversations = useConversationStore((state) => state.setConversations);
  const setFolder = useConversationStore((state) => state.setFolder);
  const setLoading = useConversationStore((state) => state.setLoading);
  const setError = useConversationStore((state) => state.setError);
  const selectConversation = useConversationStore((state) => state.selectConversation);
  const clearUnread = useConversationStore((state) => state.clearUnread);

  const [profileOpen, setProfileOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

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
        setError('加载会话失败');
      } finally {
        setLoading(false);
      }
    };

    initialLoad();

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex h-screen bg-background text-foreground">
      <aside className="flex w-80 flex-col border-r border-border">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-semibold">消息</h1>
              <Button
                variant="ghost"
                size="icon"
                aria-label="创建群聊"
                onClick={() => setCreateGroupOpen(true)}
              >
                <Plus />
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-xs">
                      {userInfo?.nickname?.charAt(0).toUpperCase() ||
                        userInfo?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{userInfo?.nickname || userInfo?.email}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => setProfileOpen(true)}
                  >
                    个人资料
                  </Button>
                  <Separator className="my-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      void handleLogout();
                    }}
                    disabled={loggingOut}
                  >
                    {loggingOut ? '退出中...' : '退出登录'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <ConversationFolders folder={folder} onChange={setFolder} />
        <Separator />

        <ScrollArea className="flex-1">
          {loading && visibleConversations.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Spinner />
              加载中...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-destructive">{error}</div>
          ) : visibleConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">暂无会话</div>
          ) : (
            <div className="flex flex-col">
              {visibleConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  selected={conversation.id === selectedConversationId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {selectedConversationId ? (
        <ChatWindow key={selectedConversationId} conversationId={selectedConversationId} />
      ) : (
        <section className="flex flex-1 items-center justify-center bg-muted/30">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">选择一个会话开始聊天</p>
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
