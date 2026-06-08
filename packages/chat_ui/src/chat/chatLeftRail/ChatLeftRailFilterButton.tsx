import { Badge } from '../../components/badge';
import { cn } from '../../lib/utils';
import type { ChatLeftRailFilterButtonProps } from './types';

export function ChatLeftRailFilterButton({
  item,
  active,
  onSelect,
}: ChatLeftRailFilterButtonProps) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      title={item.label}
      onClick={() => onSelect(item)}
      className={cn(
        'group flex w-full flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-xs text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-muted text-foreground',
      )}
    >
      <span className="relative flex size-8 items-center justify-center rounded-lg">
        <Icon className="size-4" />
        {item.count > 0 ? (
          <Badge className="absolute -right-2 -top-1 h-4 min-w-4 px-1 text-[10px]">
            {item.count > 99 ? '99+' : item.count}
          </Badge>
        ) : null}
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </button>
  );
}
