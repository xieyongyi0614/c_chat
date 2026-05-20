import { type ComponentType } from 'react';
import { Badge, cn } from '@c_chat/ui';

export function SidebarFolderButton({
  label,
  icon: Icon,
  active,
  count,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-xs text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-muted text-foreground',
      )}
    >
      <span className="relative flex size-8 items-center justify-center rounded-lg">
        <Icon className="size-4" />
        {count > 0 && (
          <Badge className="absolute -right-2 -top-1 h-4 min-w-4 px-1 text-[10px]">
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
