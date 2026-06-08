import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/dialog';
import { Alert, AlertDescription } from '../../components/alert';
import { Button } from '../../components/button';
import { Input } from '../../components/input';
import { Label } from '../../components/label';
import { Spinner } from '../../components/spinner';
import { Textarea } from '../../components/textarea';
import { ChatAvatar } from '../chat-avatar';
import type { ChatGroupDetailLabels, ChatGroupDraft } from './types';

export interface ChatGroupEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ChatGroupDraft;
  onDraftChange: (draft: ChatGroupDraft) => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string;
  maxNameLength?: number;
  groupId?: string;
  onSelectAvatar?: () => void;
  onAvatarPreview?: (avatarUrl: string) => void;
  labels?: ChatGroupDetailLabels;
}

const DEFAULT_LABELS: Required<
  Pick<
    ChatGroupDetailLabels,
    | 'edit'
    | 'description'
    | 'namePlaceholder'
    | 'avatarPlaceholder'
    | 'selectAvatar'
    | 'noticePlaceholder'
    | 'cancel'
    | 'save'
    | 'saving'
  >
> = {
  edit: '编辑群资料',
  description: '修改群名称、头像与公告',
  namePlaceholder: '群名称',
  avatarPlaceholder: '群头像 URL',
  selectAvatar: '选择群头像',
  noticePlaceholder: '群公告',
  cancel: '取消',
  save: '保存',
  saving: '保存中...',
};

export function ChatGroupEditDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onSubmit,
  submitting = false,
  error,
  maxNameLength,
  groupId,
  onSelectAvatar,
  onAvatarPreview,
  labels,
}: ChatGroupEditDialogProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const avatarPreviewUrl = draft.avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mergedLabels.edit}</DialogTitle>
          {mergedLabels.description ? (
            <DialogDescription>{mergedLabels.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="chat-group-name">{mergedLabels.namePlaceholder}</Label>
            <Input
              id="chat-group-name"
              value={draft.name}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
              placeholder={mergedLabels.namePlaceholder}
              maxLength={maxNameLength}
            />
          </div>
          <div className="relative w-fit">
            <ChatAvatar
              id={groupId ?? draft.name}
              title={draft.name}
              avatarUrl={avatarPreviewUrl}
              alt={draft.name}
              className="size-14"
              buttonLabel={avatarPreviewUrl ? draft.name : undefined}
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
                disabled={submitting}
                aria-label={mergedLabels.selectAvatar}
              >
                <Camera />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="chat-group-notice">{mergedLabels.noticePlaceholder}</Label>
            <Textarea
              id="chat-group-notice"
              value={draft.notice}
              onChange={(event) => onDraftChange({ ...draft, notice: event.target.value })}
              placeholder={mergedLabels.noticePlaceholder}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {mergedLabels.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? mergedLabels.saving : mergedLabels.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
