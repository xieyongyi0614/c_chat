'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Spinner } from '@c_chat/ui';
import { useMessageStore } from '@/lib/stores/message.store';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  isGroup: boolean;
  isLoadingLatest: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  onLoadOlder: () => Promise<boolean>;
  onReachBottom: () => void;
}

const BOTTOM_THRESHOLD = 120;
const TOP_THRESHOLD = 80;

export function MessageList({
  isGroup,
  isLoadingLatest,
  isLoadingOlder,
  hasMoreOlder,
  onLoadOlder,
  onReachBottom,
}: MessageListProps) {
  const groups = useMessageStore((state) => state.groupedMessages);
  const messageCount = useMessageStore((state) => state.messages.length);
  const conversationId = useMessageStore((state) => state.currentConversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const pendingPrependHeightRef = useRef<number | null>(null);
  const loadingOlderRef = useRef(false);
  const previousConversationRef = useRef(conversationId);

  const isNearBottom = useCallback((): boolean => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const wasNearBottom = nearBottomRef.current;
    nearBottomRef.current = isNearBottom();
    if (nearBottomRef.current && !wasNearBottom) onReachBottom();

    if (
      el.scrollTop > TOP_THRESHOLD ||
      !hasMoreOlder ||
      isLoadingOlder ||
      loadingOlderRef.current
    ) {
      return;
    }

    loadingOlderRef.current = true;
    pendingPrependHeightRef.current = el.scrollHeight;
    void onLoadOlder().then((loaded) => {
      loadingOlderRef.current = false;
      if (!loaded) pendingPrependHeightRef.current = null;
    });
  }, [hasMoreOlder, isLoadingOlder, isNearBottom, onLoadOlder, onReachBottom]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const conversationChanged = previousConversationRef.current !== conversationId;
    if (conversationChanged) {
      previousConversationRef.current = conversationId;
      nearBottomRef.current = true;
      pendingPrependHeightRef.current = null;
      scrollToBottom();
      return;
    }

    const previousHeight = pendingPrependHeightRef.current;
    if (previousHeight != null) {
      el.scrollTop += el.scrollHeight - previousHeight;
      pendingPrependHeightRef.current = null;
      return;
    }

    if (nearBottomRef.current) scrollToBottom();
  }, [conversationId, messageCount, scrollToBottom]);

  useEffect(() => {
    if (nearBottomRef.current && messageCount > 0) onReachBottom();
  }, [messageCount, onReachBottom]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col overflow-y-auto p-4"
    >
      {isLoadingOlder && (
        <div className="flex justify-center py-2 text-xs text-muted-foreground">
          <Spinner className="size-4" />
        </div>
      )}

      {!isLoadingLatest && !hasMoreOlder && messageCount > 0 && (
        <div className="py-1 text-center text-xs text-muted-foreground">没有更早消息了</div>
      )}

      {isLoadingLatest && messageCount === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Spinner />
        </div>
      ) : messageCount === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          还没有消息，发送第一条吧
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.dateKey} className="flex flex-col gap-3">
              <div className="flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {group.dateLabel}
                </span>
              </div>
              {group.items.map((item) => (
                <MessageItem
                  key={item.message.id}
                  message={item.message}
                  isGroup={isGroup}
                  showSender={item.showSender}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
