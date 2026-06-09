import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { cn, DEFAULT_SCROLL_TO_BOTTOM_EVENT } from '../../../lib/utils';
import { Button } from '../../../components/button';

const DEFAULT_BOTTOM_THRESHOLD = 120;
const DEFAULT_TOP_LOAD_THRESHOLD = 80;
const DEFAULT_KEEP_BOTTOM_MS = 1200;
const MESSAGE_ANCHOR_SELECTOR = '[data-message-anchor]';

export interface ChatMessageScrollAreaLabels {
  loadingOlder?: ReactNode;
  loadingLatest?: ReactNode;
  noMoreOlder?: ReactNode;
  scrollToBottom?: string;
}

export interface ChatMessageScrollAreaProps extends Omit<ComponentProps<'div'>, 'onScroll'> {
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

interface ScrollAnchorSnapshot {
  id: string;
  top: number;
}

function ChatMessageScrollAreaWrapper({
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
  const pendingPrependAnchorRef = useRef<ScrollAnchorSnapshot | null>(null);
  const scrollAnchorRef = useRef<ScrollAnchorSnapshot | null>(null);
  const isLoadingOlderRef = useRef(false);
  const keepBottomUntilRef = useRef(0);
  const lastScrollHeightRef = useRef(0);
  const scrollToBottomGenerationRef = useRef(0);
  const userScrollIntentRef = useRef(false);

  const getAnchorSnapshot = useCallback((): ScrollAnchorSnapshot | null => {
    const el = scrollRef.current;
    if (!el) return null;

    const containerTop = el.getBoundingClientRect().top;
    const anchors = Array.from(el.querySelectorAll<HTMLElement>(MESSAGE_ANCHOR_SELECTOR));
    const anchor =
      anchors.find((item) => item.getBoundingClientRect().bottom >= containerTop) ?? anchors[0];
    const id = anchor?.dataset.messageAnchor;
    if (!anchor || !id) return null;

    return {
      id,
      top: anchor.getBoundingClientRect().top - containerTop,
    };
  }, []);

  const restoreAnchorSnapshot = useCallback((snapshot: ScrollAnchorSnapshot) => {
    const el = scrollRef.current;
    if (!el) return false;

    const anchor = el.querySelector<HTMLElement>(
      `[data-message-anchor="${CSS.escape(snapshot.id)}"]`,
    );
    if (!anchor) return false;

    const containerTop = el.getBoundingClientRect().top;
    const nextTop = anchor.getBoundingClientRect().top - containerTop;
    const scrollDelta = nextTop - snapshot.top;
    if (scrollDelta !== 0) {
      el.scrollTop += scrollDelta;
    }
    return true;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, []);

  const scheduleScrollToBottom = useCallback(() => {
    const generation = scrollToBottomGenerationRef.current;
    scrollToBottom();
    requestAnimationFrame(() => {
      if (scrollToBottomGenerationRef.current !== generation) return;
      scrollToBottom();
      requestAnimationFrame(() => {
        if (scrollToBottomGenerationRef.current !== generation) return;
        scrollToBottom();
      });
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

  const getNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom <= bottomThreshold;
  }, [bottomThreshold]);

  const handleScrollToBottom = useCallback(() => {
    shouldStickToBottomRef.current = true;
    userScrollIntentRef.current = false;
    scrollToBottomGenerationRef.current += 1;
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

    const nearBottom = getNearBottom();
    if (nearBottom) {
      shouldStickToBottomRef.current = true;
      setShowScrollToBottom(false);
    } else if (userScrollIntentRef.current) {
      shouldStickToBottomRef.current = false;
      setShowScrollToBottom(messageCount > 0);
      keepBottomUntilRef.current = 0;
      scrollToBottomGenerationRef.current += 1;
    }
    scrollAnchorRef.current = getAnchorSnapshot();

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
    userScrollIntentRef.current = false;
    keepBottomUntilRef.current = 0;
    scrollToBottomGenerationRef.current += 1;
    pendingPrependAnchorRef.current = getAnchorSnapshot();
    void loadOlderMessages()
      .then((loaded) => {
        if (!loaded) {
          pendingPrependAnchorRef.current = null;
        }
      })
      .finally(() => {
        isLoadingOlderRef.current = false;
      });
  }, [
    getAnchorSnapshot,
    getNearBottom,
    hasMoreOlder,
    isLoadingOlder,
    loadOlderMessages,
    messageCount,
    topLoadThreshold,
  ]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const conversationChanged = previousConversationKeyRef.current !== conversationKey;
    if (conversationChanged) {
      previousConversationKeyRef.current = conversationKey;
      shouldStickToBottomRef.current = true;
      pendingPrependAnchorRef.current = null;
      scrollAnchorRef.current = null;
      isLoadingOlderRef.current = false;
      userScrollIntentRef.current = false;
      keepBottomUntilRef.current = Date.now() + keepBottomMs;
    }

    const pendingPrependAnchor = pendingPrependAnchorRef.current;
    if (pendingPrependAnchor) {
      if (restoreAnchorSnapshot(pendingPrependAnchor)) {
        pendingPrependAnchorRef.current = null;
        lastScrollHeightRef.current = el.scrollHeight;
        updateNearBottom();
        scrollAnchorRef.current = getAnchorSnapshot();
        shouldStickToBottomRef.current = false;
      }
      return;
    }

    if (isLoadingOlderRef.current) {
      lastScrollHeightRef.current = el.scrollHeight;
      return;
    }

    if (conversationChanged || shouldStickToBottomRef.current) {
      scheduleScrollToBottom();
      lastScrollHeightRef.current = el.scrollHeight;
      updateNearBottom();
      return;
    }

    lastScrollHeightRef.current = el.scrollHeight;
    scrollAnchorRef.current = getAnchorSnapshot();
  }, [
    conversationKey,
    getAnchorSnapshot,
    keepBottomMs,
    restoreAnchorSnapshot,
    scheduleScrollToBottom,
    updateNearBottom,
  ]);

  useEffect(() => {
    const el = scrollRef.current;
    const contentEl = contentRef.current;
    if (!el || !contentEl) return;

    const resizeObserver = new ResizeObserver(() => {
      const currentHeight = el.scrollHeight;
      const previousHeight = lastScrollHeightRef.current || currentHeight;
      const heightDelta = currentHeight - previousHeight;
      lastScrollHeightRef.current = currentHeight;

      const pendingPrependAnchor = pendingPrependAnchorRef.current;
      if (pendingPrependAnchor) {
        if (restoreAnchorSnapshot(pendingPrependAnchor)) {
          pendingPrependAnchorRef.current = null;
          updateNearBottom();
          scrollAnchorRef.current = getAnchorSnapshot();
        }
        return;
      }

      if (shouldStickToBottomRef.current || Date.now() <= keepBottomUntilRef.current) {
        scheduleScrollToBottom();
      } else if (heightDelta !== 0 && scrollAnchorRef.current) {
        restoreAnchorSnapshot(scrollAnchorRef.current);
      }

      updateNearBottom();
      scrollAnchorRef.current = getAnchorSnapshot();
    });

    resizeObserver.observe(el);
    resizeObserver.observe(contentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [getAnchorSnapshot, restoreAnchorSnapshot, scheduleScrollToBottom, updateNearBottom]);

  return (
    <div className="chat-text-container relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
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
        onPointerDown={() => {
          userScrollIntentRef.current = true;
        }}
        onWheel={() => {
          userScrollIntentRef.current = true;
        }}
        onTouchStart={() => {
          userScrollIntentRef.current = true;
        }}
        className={cn(
          'chat-flex flex min-h-0 w-full flex-1 basis-0 flex-col justify-start overflow-y-auto py-2 pe-2 pb-4 [scrollbar-gutter:stable]',
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

export const ChatMessageScrollArea = memo(ChatMessageScrollAreaWrapper);
