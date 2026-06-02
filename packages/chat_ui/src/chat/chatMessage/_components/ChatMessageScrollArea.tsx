import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/button';

const DEFAULT_BOTTOM_THRESHOLD = 120;
const DEFAULT_TOP_LOAD_THRESHOLD = 80;
const DEFAULT_KEEP_BOTTOM_MS = 1200;
const DEFAULT_SCROLL_TO_BOTTOM_EVENT = 'chat:scroll-to-bottom';

interface ChatMessageScrollAreaLabels {
  loadingOlder?: ReactNode;
  loadingLatest?: ReactNode;
  noMoreOlder?: ReactNode;
  scrollToBottom?: string;
}

interface ChatMessageScrollAreaProps extends Omit<ComponentProps<'div'>, 'onScroll'> {
  conversationKey: string | null | undefined;
  messageCount: number;
  hasMoreOlder: boolean;
  isLoadingOlder: boolean;
  isLoadingLatest: boolean;
  loadOlderMessages: () => Promise<boolean>;
  bottomThreshold?: number;
  topLoadThreshold?: number;
  keepBottomMs?: number;
  scrollToBottomEventName?: string;
  labels?: ChatMessageScrollAreaLabels;
}

function ChatMessageScrollArea({
  conversationKey,
  messageCount,
  hasMoreOlder,
  isLoadingOlder,
  isLoadingLatest,
  loadOlderMessages,
  bottomThreshold = DEFAULT_BOTTOM_THRESHOLD,
  topLoadThreshold = DEFAULT_TOP_LOAD_THRESHOLD,
  keepBottomMs = DEFAULT_KEEP_BOTTOM_MS,
  scrollToBottomEventName = DEFAULT_SCROLL_TO_BOTTOM_EVENT,
  labels,
  className,
  children,
  ...props
}: ChatMessageScrollAreaProps) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousConversationKeyRef = useRef(conversationKey);
  const pendingPrependHeightRef = useRef<number | null>(null);
  const isLoadingOlderRef = useRef(false);
  const keepBottomUntilRef = useRef(0);
  const lastScrollHeightRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, []);

  const scheduleScrollToBottom = useCallback(() => {
    scrollToBottom();
    requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    });
  }, [scrollToBottom]);

  const updateNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceToBottom <= bottomThreshold;
    shouldStickToBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom && messageCount > 0);
    return nearBottom;
  }, [bottomThreshold, messageCount]);

  const handleScrollToBottom = useCallback(() => {
    shouldStickToBottomRef.current = true;
    keepBottomUntilRef.current = Date.now() + keepBottomMs;
    scheduleScrollToBottom();

    const el = scrollRef.current;
    if (el) {
      lastScrollHeightRef.current = el.scrollHeight;
    }

    requestAnimationFrame(() => {
      scheduleScrollToBottom();
      updateNearBottom();
    });
  }, [keepBottomMs, scheduleScrollToBottom, updateNearBottom]);

  useEffect(() => {
    window.addEventListener(scrollToBottomEventName, handleScrollToBottom);
    return () => {
      window.removeEventListener(scrollToBottomEventName, handleScrollToBottom);
    };
  }, [handleScrollToBottom, scrollToBottomEventName]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateNearBottom();

    if (
      el.scrollTop > topLoadThreshold ||
      !hasMoreOlder ||
      isLoadingOlder ||
      isLoadingOlderRef.current
    ) {
      return;
    }

    isLoadingOlderRef.current = true;
    shouldStickToBottomRef.current = false;
    pendingPrependHeightRef.current = el.scrollHeight;
    void loadOlderMessages()
      .then((loaded) => {
        if (!loaded) {
          pendingPrependHeightRef.current = null;
        }
      })
      .finally(() => {
        isLoadingOlderRef.current = false;
      });
  }, [hasMoreOlder, isLoadingOlder, loadOlderMessages, topLoadThreshold, updateNearBottom]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const conversationChanged = previousConversationKeyRef.current !== conversationKey;
    if (conversationChanged) {
      previousConversationKeyRef.current = conversationKey;
      shouldStickToBottomRef.current = true;
      pendingPrependHeightRef.current = null;
      isLoadingOlderRef.current = false;
      keepBottomUntilRef.current = Date.now() + keepBottomMs;
    }

    const previousHeight = pendingPrependHeightRef.current;
    if (previousHeight != null) {
      el.scrollTop += el.scrollHeight - previousHeight;
      pendingPrependHeightRef.current = null;
      lastScrollHeightRef.current = el.scrollHeight;
      updateNearBottom();
      return;
    }

    if (conversationChanged || shouldStickToBottomRef.current) {
      scheduleScrollToBottom();
      lastScrollHeightRef.current = el.scrollHeight;
      updateNearBottom();
      return;
    }

    lastScrollHeightRef.current = el.scrollHeight;
  }, [conversationKey, keepBottomMs, messageCount, scheduleScrollToBottom, updateNearBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    const contentEl = contentRef.current;
    if (!el || !contentEl) return;

    const resizeObserver = new ResizeObserver(() => {
      const currentHeight = el.scrollHeight;
      const previousHeight = lastScrollHeightRef.current || currentHeight;
      const heightDelta = currentHeight - previousHeight;
      lastScrollHeightRef.current = currentHeight;

      if (pendingPrependHeightRef.current != null) return;

      if (shouldStickToBottomRef.current || Date.now() <= keepBottomUntilRef.current) {
        scheduleScrollToBottom();
      } else if (heightDelta !== 0) {
        el.scrollTop += heightDelta;
      }

      updateNearBottom();
    });

    resizeObserver.observe(el);
    resizeObserver.observe(contentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scheduleScrollToBottom, updateNearBottom]);

  return (
    <div className="chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
        {isLoadingOlder && (
          <div className="bg-background/95 text-muted-foreground flex items-center gap-2 rounded-b-md border px-3 py-1 text-xs shadow-sm">
            <Loader2 className="size-3.5 animate-spin" />
            <span>{labels?.loadingOlder ?? '加载更早消息...'}</span>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          'chat-flex flex h-40 w-full grow flex-col justify-start overflow-y-auto py-2 pe-4 pb-4',
          className,
        )}
        {...props}
      >
        <div ref={contentRef} className="flex flex-col justify-start gap-4">
          {isLoadingLatest && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              <span>{labels?.loadingLatest ?? '加载消息...'}</span>
            </div>
          )}

          {!isLoadingLatest && !hasMoreOlder && messageCount > 0 && (
            <div className="text-muted-foreground py-1 text-center text-xs">
              {labels?.noMoreOlder ?? '没有更早消息了'}
            </div>
          )}

          {children}
        </div>
      </div>

      {showScrollToBottom && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={handleScrollToBottom}
          title={labels?.scrollToBottom ?? '滚动到底部'}
          className="absolute bottom-5 right-8 z-20 size-9 rounded-full border bg-background/95 shadow-md"
        >
          <ArrowDown />
        </Button>
      )}
    </div>
  );
}

export { ChatMessageScrollArea };
export type { ChatMessageScrollAreaLabels, ChatMessageScrollAreaProps };
