import type { ReactNode } from 'react';
import { Badge } from '../../components/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/dialog';
import { ChatAvatar } from '../chat-avatar';

export interface ChatUserInfoDialogProfile {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  fallback?: ReactNode;
}

export interface ChatUserInfoDialogLabels {
  title?: ReactNode;
  ownBadge?: ReactNode;
}

export interface ChatUserInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ChatUserInfoDialogProfile;
  isCurrentUser?: boolean;
  onAvatarPreview?: (avatarUrl: string) => void;
  labels?: ChatUserInfoDialogLabels;
}

const DEFAULT_LABELS: Required<ChatUserInfoDialogLabels> = {
  title: '账号信息',
  ownBadge: '我',
};

export function ChatUserInfoDialog({
  open,
  onOpenChange,
  profile,
  isCurrentUser = false,
  onAvatarPreview,
  labels,
}: ChatUserInfoDialogProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const displayName = profile.name || profile.email || profile.id;
  const avatarPreviewUrl = profile.avatarUrl ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{mergedLabels.title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <ChatAvatar
            id={profile.id}
            title={displayName}
            avatarUrl={avatarPreviewUrl}
            alt={displayName}
            fallback={profile.fallback}
            className="size-20"
            fallbackClassName="text-lg"
            buttonLabel={avatarPreviewUrl ? displayName : undefined}
            onClick={
              avatarPreviewUrl && onAvatarPreview
                ? () => onAvatarPreview(avatarPreviewUrl)
                : undefined
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">{displayName}</h2>
              {isCurrentUser ? <Badge variant="secondary">{mergedLabels.ownBadge}</Badge> : null}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {profile.email || profile.id}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
