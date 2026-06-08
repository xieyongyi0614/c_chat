import { Badge } from '../../components/badge';
import { cn } from '../../lib/utils';
import type { ChatLeftRailNavButtonProps } from './types';

export function ChatLeftRailNavButton({ item, active, onSelect }: ChatLeftRailNavButtonProps) {
  const Icon = item.icon;
  const unreadCount = item.unreadCount ?? 0;

  return (
    <button
      type="button"
      title={item.label}
      onClick={() => onSelect(item)}
      className={cn(
        'relative flex size-12 items-center justify-center rounded-xl text-muted-foreground transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : 'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-5" />
      {unreadCount > 0 ? (
        <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : null}
    </button>
  );
}
