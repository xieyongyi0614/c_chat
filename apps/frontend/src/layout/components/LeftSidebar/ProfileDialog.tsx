import { Camera, Check, Edit3 } from 'lucide-react';
import {
  Button,
  ChatAvatar,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@c_chat/ui';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import type { ProfileStats, SidebarProfile } from './types';

export function ProfileDialog({
  open,
  profile,
  draftProfile,
  email,
  stats,
  saving = false,
  onOpenChange,
  onDraftChange,
  onSelectAvatar,
  onSave,
}: {
  open: boolean;
  profile: SidebarProfile;
  draftProfile: SidebarProfile;
  email?: string;
  stats: ProfileStats;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (profile: SidebarProfile) => void;
  onSelectAvatar: () => void;
  onSave: () => void;
}) {
  const updateDraftProfile = (patch: Partial<SidebarProfile>) => {
    onDraftChange({ ...draftProfile, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{'\u8d26\u53f7\u8d44\u6599'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ChatAvatar
                id={draftProfile.id}
                title={draftProfile.nickname}
                avatarUrl={formatFileUrl(draftProfile.avatarUrl)}
                alt={draftProfile.nickname}
                className="size-20"
                fallbackClassName="text-lg"
              />
              <Button
                type="button"
                size="icon-xs"
                className="absolute -bottom-1 -right-1 rounded-full"
                onClick={onSelectAvatar}
                disabled={saving}
              >
                <Camera className="size-3.5" />
              </Button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold">{profile.nickname}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  <Check className="size-3" />
                  {'\u5728\u7ebf'}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sidebar-nickname">{'\u6635\u79f0'}</Label>
            <Input
              id="sidebar-nickname"
              value={draftProfile.nickname}
              onChange={(event) => updateDraftProfile({ nickname: event.target.value })}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
            <div>
              <div className="text-sm font-semibold">{stats.conversations}</div>
              <div className="text-xs text-muted-foreground">{'\u4f1a\u8bdd'}</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.unread}</div>
              <div className="text-xs text-muted-foreground">{'\u672a\u8bfb'}</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.groups}</div>
              <div className="text-xs text-muted-foreground">{'\u7fa4\u7ec4'}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {'\u53d6\u6d88'}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <Edit3 className="size-4" />
            {saving ? '\u4fdd\u5b58\u4e2d...' : '\u4fdd\u5b58'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
