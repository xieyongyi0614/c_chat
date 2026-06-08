import { Camera, Shield, UsersRound } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/alert-dialog';
import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/dialog';
import { Input } from '../../components/input';
import { ScrollArea } from '../../components/scroll-area';
import { Separator } from '../../components/separator';
import { Spinner } from '../../components/spinner';
import { Textarea } from '../../components/textarea';
import { ChatAvatar } from '../chat-avatar';
import type { ChatGroupDetailLabels, ChatGroupDraft, ChatGroupInfo, ChatGroupMember } from './types';

export interface ChatGroupDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: ChatGroupInfo | null;
  members: ChatGroupMember[];
  loading?: boolean;
  loadError?: string;
  isOwner: boolean;
  saving?: boolean;
  actionPending?: boolean;
  draft?: ChatGroupDraft;
  maxNameLength?: number;
  inlineEdit?: boolean;
  onDraftChange?: (draft: ChatGroupDraft) => void;
  onRetry?: () => void;
  onSave?: () => void;
  onOpenEdit?: () => void;
  onOpenInvite?: () => void;
  onAvatarPreview?: (avatarUrl: string) => void;
  onMemberAvatarPreview?: (member: ChatGroupMember) => void;
  onSelectAvatar?: () => void;
  onLeave?: () => void;
  onDismiss?: () => void;
  labels?: ChatGroupDetailLabels;
}

const DEFAULT_LABELS: Required<ChatGroupDetailLabels> = {
  title: '群资料',
  description: '查看群信息与成员',
  loading: '加载群资料中...',
  retry: '重试',
  notFound: '群信息不存在',
  fallbackName: '群聊',
  noNotice: '暂无群公告',
  members: '成员',
  loadingShort: '加载中...',
  emptyMembers: '暂无成员',
  owner: '群主',
  edit: '编辑群资料',
  invite: '邀请成员',
  leave: '退出群聊',
  dismiss: '解散群聊',
  dismissTitle: '确认解散群聊？',
  dismissDescription: '解散后所有成员将无法继续发送消息，会话也会从列表中移除。',
  dismissConfirm: '解散',
  leaveTitle: '退出群聊？',
  leaveDescription: '退出后将不再接收该群消息，确认退出？',
  leaveConfirm: '确认退出',
  cancel: '取消',
  save: '保存群资料',
  saving: '保存中...',
  namePlaceholder: '群名称',
  avatarPlaceholder: '群头像 URL',
  selectAvatar: '选择群头像',
  noticePlaceholder: '群公告',
};

export function ChatGroupDetailDialog({
  open,
  onOpenChange,
  group,
  members,
  loading = false,
  loadError,
  isOwner,
  saving = false,
  actionPending = false,
  draft,
  maxNameLength,
  inlineEdit = false,
  onDraftChange,
  onRetry,
  onSave,
  onOpenEdit,
  onOpenInvite,
  onAvatarPreview,
  onMemberAvatarPreview,
  onSelectAvatar,
  onLeave,
  onDismiss,
  labels,
}: ChatGroupDetailDialogProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const groupId = group?.id ?? '';
  const groupName = group?.name ?? mergedLabels.fallbackName;
  const avatarUrl = inlineEdit && draft ? draft.avatarUrl : group?.avatarUrl;
  const groupAvatarLabel = typeof groupName === 'string' ? groupName : undefined;
  const canSave = Boolean(draft?.name.trim()) && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] max-w-[560px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{mergedLabels.title}</DialogTitle>
          {mergedLabels.description ? (
            <DialogDescription>{mergedLabels.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-1">
          <div className="flex flex-col gap-4">
            {loading && !group ? (
              <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                {mergedLabels.loading}
              </div>
            ) : null}

            {!loading && loadError && !group ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <span>{loadError}</span>
                {onRetry ? (
                  <Button variant="outline" onClick={onRetry}>
                    {mergedLabels.retry}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {!loading && !loadError && !group ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
                {mergedLabels.notFound}
              </div>
            ) : null}

            {group && !loadError ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <ChatAvatar
                      id={groupId}
                      title={typeof groupName === 'string' ? groupName : undefined}
                      avatarUrl={avatarUrl}
                      alt={typeof groupName === 'string' ? groupName : ''}
                      className="size-14"
                      buttonLabel={avatarUrl ? groupAvatarLabel : undefined}
                      onClick={
                        avatarUrl && onAvatarPreview ? () => onAvatarPreview(avatarUrl) : undefined
                      }
                    />
                    {isOwner && inlineEdit && draft && onSelectAvatar ? (
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
                      <span className="truncate text-base font-semibold">{groupName}</span>
                      <Badge variant="secondary">
                        <UsersRound />
                        {members.length}
                      </Badge>
                    </div>
                    {group?.createTimeLabel ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {group.createTimeLabel}
                      </p>
                    ) : null}
                    <p className="truncate text-sm text-muted-foreground">
                      {group?.notice || mergedLabels.noNotice}
                    </p>
                  </div>
                </div>

                <Separator />

                {isOwner && inlineEdit && draft && onDraftChange ? (
                  <div className="flex flex-col gap-3">
                    <Input
                      value={draft.name}
                      onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                      maxLength={maxNameLength}
                      placeholder={mergedLabels.namePlaceholder}
                    />
                    <Textarea
                      value={draft.notice}
                      onChange={(event) => onDraftChange({ ...draft, notice: event.target.value })}
                      placeholder={mergedLabels.noticePlaceholder}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      {onOpenInvite ? (
                        <Button variant="outline" onClick={onOpenInvite}>
                          {mergedLabels.invite}
                        </Button>
                      ) : null}
                      {onSave ? (
                        <Button onClick={onSave} disabled={!canSave}>
                          {saving ? <Spinner /> : null}
                          {saving ? mergedLabels.saving : mergedLabels.save}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {isOwner && !inlineEdit ? (
                  <div className="flex gap-2">
                    {onOpenEdit ? (
                      <Button variant="outline" className="flex-1" onClick={onOpenEdit}>
                        {mergedLabels.edit}
                      </Button>
                    ) : null}
                    {onOpenInvite ? (
                      <Button variant="outline" className="flex-1" onClick={onOpenInvite}>
                        {mergedLabels.invite}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{mergedLabels.members}</span>
                    {loading ? (
                      <span className="text-xs text-muted-foreground">
                        {mergedLabels.loadingShort}
                      </span>
                    ) : (
                      <Badge variant="secondary">{members.length}</Badge>
                    )}
                  </div>
                  <ScrollArea className="h-56 rounded-md border">
                    <div className="flex flex-col gap-1 p-2">
                      {!loading && members.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          {mergedLabels.emptyMembers}
                        </div>
                      ) : null}
                      {members.map((member) => {
                        const memberName = member.alias || member.nickname || member.userId;
                        const memberAvatarLabel =
                          typeof memberName === 'string' ? memberName : undefined;
                        return (
                          <div
                            key={member.userId}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5"
                          >
                            <ChatAvatar
                              id={member.userId ?? ''}
                              title={memberName}
                              avatarUrl={member.avatarUrl}
                              alt={memberName ?? ''}
                              className="size-9 shrink-0"
                              fallbackClassName="text-xs"
                              buttonLabel={member.avatarUrl ? memberAvatarLabel : undefined}
                              onClick={
                                member.avatarUrl && onMemberAvatarPreview
                                  ? () => onMemberAvatarPreview(member)
                                  : undefined
                              }
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{memberName}</span>
                            {member.role === 0 ? (
                              <Badge variant="secondary">
                                <Shield />
                                {mergedLabels.owner}
                              </Badge>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <DialogFooter>
                  {!isOwner && onLeave ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={actionPending}>
                          {mergedLabels.leave}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{mergedLabels.leaveTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {mergedLabels.leaveDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel size="default" variant="outline">
                            {mergedLabels.cancel}
                          </AlertDialogCancel>
                          <AlertDialogAction size="default" variant="default" onClick={onLeave}>
                            {mergedLabels.leaveConfirm}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                  {isOwner && onDismiss ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={actionPending}>
                          {mergedLabels.dismiss}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{mergedLabels.dismissTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {mergedLabels.dismissDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel size="default" variant="outline">
                            {mergedLabels.cancel}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            size="default"
                            variant="destructive"
                            onClick={onDismiss}
                          >
                            {mergedLabels.dismissConfirm}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </DialogFooter>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
