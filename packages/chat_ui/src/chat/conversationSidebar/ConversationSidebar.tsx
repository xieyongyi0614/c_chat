import { Fragment, memo } from 'react';
import { MessagesSquare, SearchIcon } from 'lucide-react';
import { Input } from '../../components/input';
import { ScrollArea } from '../../components/scroll-area';
import { Separator } from '../../components/separator';
import { Spinner } from '../../components/spinner';
import { cn } from '../../lib/utils';
import { ConversationSidebarItem } from './ConversationSidebarItem';
import type { ConversationSidebarLabels, ConversationSidebarProps } from './types';

const DEFAULT_LABELS: Required<ConversationSidebarLabels> = {
  title: 'Messages',
  searchPlaceholder: 'Search conversations...',
  searchLabel: 'Search',
  avatarAlt: 'conversation avatar',
  unnamedConversation: 'Unnamed conversation',
  emptyMessage: 'No conversations',
  loadingMessage: 'Loading...',
  noMessage: 'No messages',
  groupNoMessage: 'Group chat',
};

function ConversationSidebarBase({
  conversations,
  selectedConversationId,
  search,
  onSearchChange,
  onSelectConversation,
  formatAvatarUrl = (url) => url ?? '',
  headerAction,
  loading = false,
  error,
  empty,
  labels,
  className,
}: ConversationSidebarProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  return (
    <aside className={cn('flex w-72 shrink-0 flex-col gap-2 2xl:w-80', className)}>
      <div className="sticky top-0 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:mx-0 sm:p-0 sm:shadow-none">
        <div className="flex items-center justify-between py-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{mergedLabels.title}</h1>
            <MessagesSquare className="size-5 shrink-0" />
          </div>
          {headerAction}
        </div>

        <label className="relative block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 stroke-muted-foreground" />
          <span className="sr-only">{mergedLabels.searchLabel}</span>
          <Input
            className="h-10 ps-8"
            placeholder={mergedLabels.searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      <ScrollArea className="-mx-3 min-h-0 flex-1 overflow-auto p-3" type="auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Spinner />
            {mergedLabels.loadingMessage}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-destructive">{error}</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {empty ?? mergedLabels.emptyMessage}
          </div>
        ) : (
          conversations.map((conversation) => (
            <Fragment key={conversation.id}>
              <ConversationSidebarItem
                conversation={conversation}
                selected={selectedConversationId === conversation.id}
                onSelect={onSelectConversation}
                formatAvatarUrl={formatAvatarUrl}
                labels={mergedLabels}
              />
              <Separator className="my-1" />
            </Fragment>
          ))
        )}
      </ScrollArea>
    </aside>
  );
}

export const ConversationSidebar = memo(ConversationSidebarBase);
