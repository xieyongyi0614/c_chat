import { useEffect, useRef, useState, type ChangeEvent, type ComponentType } from 'react';
import { Camera, Check, Edit3, LogOut, MoreHorizontal, UserCircle } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  cn,
} from '@c_chat/ui';

export type SidebarProfile = {
  avatarUrl: string;
  nickname: string;
};

export type ProfileStats = {
  conversations: number;
  unread: number;
  groups: number;
};

const getInitials = (value?: string | null) => {
  const text = value?.trim();
  if (!text) return 'ME';
  return text.slice(0, 2).toUpperCase();
};

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
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
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
      label: '账号资料',
      icon: UserCircle,
      onClick: onOpenProfile,
    },
    {
      label: '退出登录',
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
        title="账户菜单"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar className="size-11 ring-2 ring-background">
          <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />
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

export function ProfileDialog({
  open,
  profile,
  draftProfile,
  email,
  stats,
  onOpenChange,
  onDraftChange,
  onAvatarFileChange,
  onSave,
}: {
  open: boolean;
  profile: SidebarProfile;
  draftProfile: SidebarProfile;
  email?: string;
  stats: ProfileStats;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (profile: SidebarProfile) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateDraftProfile = (patch: Partial<SidebarProfile>) => {
    onDraftChange({ ...draftProfile, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>账号资料</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarImage src={draftProfile.avatarUrl} alt={draftProfile.nickname} />
                <AvatarFallback className="text-lg">
                  {getInitials(draftProfile.nickname)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon-xs"
                className="absolute -bottom-1 -right-1 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-3.5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarFileChange}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold">{profile.nickname}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  <Check className="size-3" />
                  在线
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sidebar-nickname">昵称</Label>
            <Input
              id="sidebar-nickname"
              value={draftProfile.nickname}
              onChange={(event) => updateDraftProfile({ nickname: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sidebar-avatar-url">头像地址</Label>
            <Input
              id="sidebar-avatar-url"
              value={draftProfile.avatarUrl}
              onChange={(event) => updateDraftProfile({ avatarUrl: event.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
            <div>
              <div className="text-sm font-semibold">{stats.conversations}</div>
              <div className="text-xs text-muted-foreground">会话</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.unread}</div>
              <div className="text-xs text-muted-foreground">未读</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.groups}</div>
              <div className="text-xs text-muted-foreground">群组</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave}>
            <Edit3 className="size-4" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
