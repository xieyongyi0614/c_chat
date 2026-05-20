import { useEffect, useRef, useState } from 'react';
import { LogOut, MoreHorizontal, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, cn } from '@c_chat/ui';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import { getInitials } from './utils';
import type { SidebarProfile } from './types';

export function AccountMenu({
  profile,
  onOpenProfile,
  onLogout,
}: {
  profile: SidebarProfile;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const menuItems = [
    {
      label: '\u8d26\u53f7\u8d44\u6599',
      icon: UserCircle,
      onClick: onOpenProfile,
    },
    {
      label: '\u9000\u51fa\u767b\u5f55',
      icon: LogOut,
      onClick: onLogout,
      destructive: true,
    },
  ];

  const handleMenuItemClick = (onClick: () => void) => {
    setOpen(false);
    onClick();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="group flex w-full flex-col items-center gap-2 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title="\u8d26\u6237\u83dc\u5355"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar className="size-11 ring-2 ring-background">
          <AvatarImage src={formatFileUrl(profile.avatarUrl)} alt={profile.nickname} />
          <AvatarFallback>{getInitials(profile.nickname)}</AvatarFallback>
        </Avatar>
        <MoreHorizontal className="size-4 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-0 left-[calc(100%+10px)] z-50 w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => handleMenuItemClick(item.onClick)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none',
                  item.destructive && 'text-destructive hover:text-destructive',
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
