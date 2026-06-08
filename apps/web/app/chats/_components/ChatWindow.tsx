'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ConversationHeader } from '@c_chat/ui';
import { ConversationType } from '@c_chat/shared-types';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { useMessageStore } from '@/lib/stores/message.store';
import { messageService } from '@/lib/services';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { GroupProfileSheet } from './GroupProfileSheet';

const PAGE_SIZE = 50;

interface HistoryState {
  isLoadingLatest: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
}

interface ChatWindowProps {
  conversationId: string;
  headerAction?: ReactNode;
}

export function ChatWindow({ conversationId, headerAction }: ChatWindowProps) {
  const conversation = useConversationStore((state) =>
    state.conversations.find((item) => item.id === conversationId),
  );
  const setConversationMessages = useMessageStore((state) => state.setConversationMessages);
  const prependOlder = useMessageStore((state) => state.prependOlder);

  const [historyState, setHistoryState] = useState<HistoryState>({
    isLoadingLatest: true,
    isLoadingOlder: false,
    hasMoreOlder: true,
  });

  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let disposed = false;

    setConversationMessages(conversationId, []);

    const load = async () => {
      const local = await messageService.getLocalMessageHistory(conversationId, PAGE_SIZE);
      if (disposed) return;
      setConversationMessages(conversationId, local);

      const latest = await messageService.getMessageHistory(conversationId, PAGE_SIZE);
      if (disposed) return;
      setHistoryState({
        isLoadingLatest: false,
        isLoadingOlder: false,
        hasMoreOlder: latest.length >= PAGE_SIZE,
      });
    };

    load().catch((error) => {
      console.error('Failed to load history:', error);
      if (!disposed) {
        setHistoryState((state) => ({ ...state, isLoadingLatest: false }));
      }
    });

    return () => {
      disposed = true;
    };
  }, [conversationId, setConversationMessages]);

  const loadOlderMessages = useCallback(async (): Promise<boolean> => {
    const messages = useMessageStore.getState().messages;
    const earliest = messages[0];
    if (!earliest) return false;

    setHistoryState((state) => ({ ...state, isLoadingOlder: true }));
    try {
      const older = await messageService.getMessageHistory(
        conversationId,
        PAGE_SIZE,
        undefined,
        earliest.id,
      );

      const fresh = older.filter((message) => message.id !== earliest.id);
      if (fresh.length > 0) prependOlder(conversationId, fresh);

      setHistoryState((state) => ({
        ...state,
        isLoadingOlder: false,
        hasMoreOlder: older.length >= PAGE_SIZE,
      }));
      return fresh.length > 0;
    } catch (error) {
      console.error('Failed to load older messages:', error);
      setHistoryState((state) => ({ ...state, isLoadingOlder: false }));
      return false;
    }
  }, [conversationId, prependOlder]);

  const handleReachBottom = useCallback(() => {
    messageService.readMessage(conversationId).catch((error) => {
      console.error('Failed to mark read:', error);
    });
  }, [conversationId]);

  const isGroup = conversation?.type === ConversationType.Group;
  const groupId = conversation?.targetId ?? conversation?.id ?? conversationId;
  const removed = !conversation;

  return (
    <section className="m-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border bg-background shadow-xs">
      <ConversationHeader
        id={conversation?.id ?? conversationId}
        title={conversation?.targetName}
        avatarUrl={conversation?.targetAvatar}
        fallback={conversation?.targetName.charAt(0).toUpperCase()}
        description="会话信息"
        actionsSlot={headerAction}
        onMoreClick={() => {
          if (isGroup) {
            setProfileOpen(true);
          }
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4">
        <MessageList
          isGroup={isGroup}
          isLoadingLatest={historyState.isLoadingLatest}
          isLoadingOlder={historyState.isLoadingOlder}
          hasMoreOlder={historyState.hasMoreOlder}
          onLoadOlder={loadOlderMessages}
          onReachBottom={handleReachBottom}
        />

        <ChatInput conversationId={conversationId} onSent={handleReachBottom} disabled={removed} />
      </div>

      {isGroup ? (
        <GroupProfileSheet open={profileOpen} onOpenChange={setProfileOpen} groupId={groupId} />
      ) : null}
    </section>
  );
}
