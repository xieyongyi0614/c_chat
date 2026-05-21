import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useMessageStore } from '@c_chat/frontend/stores';
import MessageGroup from './message/MessageGroup';

interface MessageHistoryListProps {
  loadOlderMessages: () => Promise<boolean>;
  historyState: {
    isLoadingLatest: boolean;
    isLoadingOlder: boolean;
    hasMoreOlder: boolean;
  };
}

const BOTTOM_THRESHOLD = 120;
const TOP_LOAD_THRESHOLD = 80;

const MessageHistoryList = ({ historyState, loadOlderMessages }: MessageHistoryListProps) => {
  const msgGroups = useMessageStore((s) => s.groups);
  const dataConversationId = useMessageStore((s) => s.dataConversationId);
  const msgCount = useMessageStore((s) =>
    Object.values(s.msgMap).reduce((count, messages) => count + messages.length, 0),
  );
  const orderedGroups = useMemo(() => Array.from(msgGroups.entries()).reverse(), [msgGroups]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const previousConversationIdRef = useRef(dataConversationId);
  const pendingPrependHeightRef = useRef<number | null>(null);
  const isLoadingOlderRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const updateNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceToBottom <= BOTTOM_THRESHOLD;
    nearBottomRef.current = nearBottom;
    return nearBottom;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateNearBottom();

    if (
      el.scrollTop > TOP_LOAD_THRESHOLD ||
      !historyState.hasMoreOlder ||
      historyState.isLoadingOlder ||
      isLoadingOlderRef.current
    ) {
      return;
    }

    isLoadingOlderRef.current = true;
    pendingPrependHeightRef.current = el.scrollHeight;
    void loadOlderMessages().then((loaded) => {
      isLoadingOlderRef.current = false;
      if (!loaded) {
        pendingPrependHeightRef.current = null;
      }
    });
  }, [historyState.hasMoreOlder, historyState.isLoadingOlder, loadOlderMessages, updateNearBottom]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const conversationChanged = previousConversationIdRef.current !== dataConversationId;
    if (conversationChanged) {
      previousConversationIdRef.current = dataConversationId;
      nearBottomRef.current = true;
      pendingPrependHeightRef.current = null;
      isLoadingOlderRef.current = false;
    }

    const previousHeight = pendingPrependHeightRef.current;
    if (previousHeight != null) {
      el.scrollTop += el.scrollHeight - previousHeight;
      pendingPrependHeightRef.current = null;
      updateNearBottom();
      return;
    }

    if (conversationChanged || nearBottomRef.current) {
      scrollToBottom();
      updateNearBottom();
    }
  }, [dataConversationId, msgCount, scrollToBottom, updateNearBottom]);

  return (
    <div className="flex size-full flex-1">
      <div className="chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
          {historyState.isLoadingOlder && (
            <div className="bg-background/95 text-muted-foreground flex items-center gap-2 rounded-b-md border px-3 py-1 text-xs shadow-sm">
              <Loader2 className="size-3.5 animate-spin" />
              <span>加载更早消息...</span>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="chat-flex flex h-40 w-full grow flex-col justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4"
        >
          {historyState.isLoadingLatest && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              <span>加载消息...</span>
            </div>
          )}

          {!historyState.isLoadingLatest && !historyState.hasMoreOlder && msgCount > 0 && (
            <div className="text-muted-foreground py-1 text-center text-xs">没有更早消息了</div>
          )}

          {orderedGroups.map(([key, value]) => (
            <MessageGroup key={key} groupIds={[...value].reverse()} dateKey={key} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(MessageHistoryList);
