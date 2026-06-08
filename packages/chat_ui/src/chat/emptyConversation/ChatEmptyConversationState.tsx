import type { ReactNode } from 'react';
import { MessagesSquare } from 'lucide-react';
import { Button } from '../../components/button';
import { cn } from '../../lib/utils';

export interface ChatEmptyConversationStateProps {
  title: ReactNode;
  description?: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
  className?: string;
}

export function ChatEmptyConversationState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: ChatEmptyConversationStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 items-center justify-center bg-card text-card-foreground',
        className,
      )}
    >
      <div className="flex max-w-80 flex-col items-center gap-6 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-border">
          <MessagesSquare className="size-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </div>
    </div>
  );
}
