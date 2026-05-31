'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Spinner,
} from '@c_chat/ui';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { authService, conversationService } from '@/lib/services';
import { UserProfileDialog } from './_components/UserProfileDialog';

export default function ChatsPage() {
  const router = useRouter();
  const userInfo = useUserStore((state) => state.userInfo);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearUser = useUserStore((state) => state.clearUser);
  const conversations = useConversationStore((state) => state.conversations);
  const setConversations = useConversationStore((state) => state.setConversations);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    const loadConversations = async () => {
      try {
        const list = await conversationService.getConversationList();
        setConversations(list);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isAuthenticated, router, setConversations]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
      clearUser();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout failed:', error);
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
            <h1 className="text-xl font-semibold">消息</h1>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-xs">
                      {userInfo?.nickname?.charAt(0).toUpperCase() || userInfo?.email?.charAt(0).toUpperCase()}
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
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? '退出中...' : '退出登录'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Spinner />
              加载中...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">暂无会话</div>
          ) : (
            <div className="flex flex-col">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="cursor-pointer p-4 hover:bg-accent"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback>{conversation.targetName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="truncate text-sm font-medium">
                          {conversation.targetName}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conversation.lastMsgTime).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {conversation.lastMsgContent || '暂无消息'}
                      </p>
                    </div>
                    {(conversation.unreadCount || 0) > 0 && (
                      <Badge variant="destructive">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <section className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">选择一个会话开始聊天</p>
        </div>
      </section>

      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </main>
  );
}
