import { type ComponentType } from 'react';
import { cn } from '@c_chat/ui';

export function SidebarNavButton({
  label,
  icon: Icon,
  active,
  unreadCount,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  unreadCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : 'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-5" />
      {!!unreadCount && unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-5 text-destructive-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
