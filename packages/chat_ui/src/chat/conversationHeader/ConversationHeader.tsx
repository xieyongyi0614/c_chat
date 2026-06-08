import type { ReactNode } from 'react';
import { ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import { Button } from '../../components/button';
import { ChatAvatar } from '../chat-avatar';
import { cn } from '../../lib/utils';

export interface ConversationHeaderLabels {
  avatarAlt?: string;
  back?: string;
  more?: string;
  phone?: string;
  video?: string;
}

export interface ConversationHeaderProps {
  id: string;
  title?: string | null;
  avatarUrl?: string | null;
  description?: ReactNode;
  fallback?: ReactNode;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showCallActions?: boolean;
  showMoreButton?: boolean;
  onVideoClick?: () => void;
  onPhoneClick?: () => void;
  onMoreClick?: () => void;
  actionsSlot?: ReactNode;
  labels?: ConversationHeaderLabels;
}

export function ConversationHeader({
  id,
  title,
  avatarUrl,
  description,
  fallback,
  className,
  showBackButton = false,
  onBack,
  showCallActions = true,
  showMoreButton = true,
  onVideoClick,
  onPhoneClick,
  onMoreClick,
  actionsSlot,
  labels,
}: ConversationHeaderProps) {
  const avatarAlt = labels?.avatarAlt ?? title ?? 'conversation avatar';

  return (
    <div
      className={cn(
        'mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        {showBackButton ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="-ms-2 h-full sm:hidden"
            aria-label={labels?.back ?? 'Back'}
            onClick={onBack}
          >
            <ArrowLeft className="rtl:rotate-180" />
          </Button>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-4">
          <ChatAvatar
            id={id}
            title={title}
            avatarUrl={avatarUrl}
            alt={avatarAlt}
            fallback={fallback}
            className="size-9 shrink-0 lg:size-11"
            fallbackClassName="text-base"
          />

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-center gap-2">
              <span className="block w-full min-w-0 truncate text-sm font-medium lg:text-base">
                {title}
              </span>
            </div>
            {description ? (
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="-me-1 flex shrink-0 items-center gap-1 lg:gap-2">
        {actionsSlot}
        {showCallActions ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
              aria-label={labels?.video ?? 'Video call'}
              onClick={onVideoClick}
            >
              <Video className="stroke-muted-foreground" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="hidden size-8 rounded-full sm:inline-flex lg:size-10"
              aria-label={labels?.phone ?? 'Voice call'}
              onClick={onPhoneClick}
            >
              <Phone className="stroke-muted-foreground" />
            </Button>
          </>
        ) : null}
        {showMoreButton ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6"
            aria-label={labels?.more ?? 'More'}
            onClick={onMoreClick}
          >
            <MoreVertical className="stroke-muted-foreground" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
