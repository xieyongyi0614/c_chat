'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@c_chat/ui';
import { ConversationType } from '@c_chat/shared-types';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { useMessageStore } from '@/lib/stores/message.store';
import { messageService } from '@/lib/services';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

const PAGE_SIZE = 50;

interface HistoryState {
  isLoadingLatest: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
}

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
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

  return (
    <section className="flex flex-1 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <Avatar className="size-9">
          <AvatarImage src={conversation?.targetAvatar} alt={conversation?.targetName} />
          <AvatarFallback>{conversation?.targetName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h2 className="truncate text-base font-semibold">{conversation?.targetName}</h2>
      </header>

      <MessageList
        isGroup={isGroup}
        isLoadingLatest={historyState.isLoadingLatest}
        isLoadingOlder={historyState.isLoadingOlder}
        hasMoreOlder={historyState.hasMoreOlder}
        onLoadOlder={loadOlderMessages}
        onReachBottom={handleReachBottom}
      />

      <ChatInput conversationId={conversationId} onSent={handleReachBottom} />
    </section>
  );
}
