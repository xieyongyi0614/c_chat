import type { ReactNode } from 'react';
import { Camera, Check, Edit3 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/alert';
import { Button } from '../../components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/dialog';
import { Input } from '../../components/input';
import { Label } from '../../components/label';
import { ChatAvatar } from '../chat-avatar';

export interface ChatProfileDialogProfile {
  id: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface ChatProfileDialogStatsItem {
  id: string;
  label: ReactNode;
  value: ReactNode;
}

export interface ChatProfileDialogLabels {
  title?: ReactNode;
  nickname?: string;
  online?: ReactNode;
  cancel?: ReactNode;
  save?: ReactNode;
  saving?: ReactNode;
  selectAvatar?: string;
}

export interface ChatProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ChatProfileDialogProfile;
  draftNickname: string;
  email?: ReactNode;
  stats?: ChatProfileDialogStatsItem[];
  error?: ReactNode;
  success?: ReactNode;
  saving?: boolean;
  onNicknameChange: (nickname: string) => void;
  onAvatarPreview?: (avatarUrl: string) => void;
  onSelectAvatar?: () => void;
  onSave: () => void;
  labels?: ChatProfileDialogLabels;
}

const DEFAULT_LABELS: Required<ChatProfileDialogLabels> = {
  title: '账号资料',
  nickname: '昵称',
  online: '在线',
  cancel: '取消',
  save: '保存',
  saving: '保存中...',
  selectAvatar: '选择头像',
};

export function ChatProfileDialog({
  open,
  onOpenChange,
  profile,
  draftNickname,
  email,
  stats,
  error,
  success,
  saving = false,
  onNicknameChange,
  onAvatarPreview,
  onSelectAvatar,
  onSave,
  labels,
}: ChatProfileDialogProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const displayName = profile.nickname || draftNickname;
  const avatarPreviewUrl = profile.avatarUrl ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{mergedLabels.title}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center gap-4">
            <div className="relative">
              <ChatAvatar
                id={profile.id}
                title={displayName}
                avatarUrl={avatarPreviewUrl}
                alt={displayName ?? ''}
                className="size-20"
                fallbackClassName="text-lg"
                buttonLabel={avatarPreviewUrl ? mergedLabels.selectAvatar : undefined}
                onClick={
                  avatarPreviewUrl && onAvatarPreview
                    ? () => onAvatarPreview(avatarPreviewUrl)
                    : undefined
                }
              />
              {onSelectAvatar ? (
                <Button
                  type="button"
                  size="icon-xs"
                  className="absolute -right-1 -bottom-1 rounded-full"
                  onClick={onSelectAvatar}
                  disabled={saving}
                  aria-label={mergedLabels.selectAvatar}
                >
                  <Camera />
                </Button>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold">{displayName}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  <Check className="size-3" />
                  {mergedLabels.online}
                </span>
              </div>
              {email ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="chat-profile-nickname">{mergedLabels.nickname}</Label>
            <Input
              id="chat-profile-nickname"
              value={draftNickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              disabled={saving}
            />
          </div>

          {stats?.length ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
              {stats.map((item) => (
                <div key={item.id}>
                  <div className="text-sm font-semibold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {mergedLabels.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              <Edit3 />
              {saving ? mergedLabels.saving : mergedLabels.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
