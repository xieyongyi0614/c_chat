'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  ChatAvatar,
  ScrollArea,
  Separator,
  Spinner,
} from '@c_chat/ui';
import { formatCompactTime } from '@c_chat/shared-utils';
import type { IGroupInfo, IGroupMemberInfo } from '@c_chat/shared-protobuf';
import { groupService } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { GroupEditDialog } from './GroupEditDialog';
import { GroupInviteDialog } from './GroupInviteDialog';

interface GroupProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const roleLabel = (role: number | null | undefined): string => {
  switch (role) {
    case 0:
      return '群主';
    case 1:
      return '管理员';
    default:
      return '';
  }
};

export function GroupProfileSheet({ open, onOpenChange, groupId }: GroupProfileSheetProps) {
  const currentUserId = useUserStore((state) => state.userInfo?.id);
  const selectConversation = useConversationStore((state) => state.selectConversation);
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId);

  const [group, setGroup] = useState<IGroupInfo | null>(null);
  const [members, setMembers] = useState<IGroupMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    groupService
      .getGroupDetail({ groupId })
      .then((detail) => {
        setGroup(detail.group ?? null);
        setMembers(detail.members ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载群详情失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [groupId]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const isOwner = Boolean(group?.ownerId && group.ownerId === currentUserId);
  const existingMemberIds = members.map((member) => member.userId ?? '').filter(Boolean);

  const afterRemoval = () => {
    if (selectedConversationId === groupId) {
      selectConversation(null);
    }
    onOpenChange(false);
  };

  const handleLeave = async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      const response = await groupService.leaveGroup({ groupId });
      if (response.success) afterRemoval();
    } catch (err) {
      setError(err instanceof Error ? err.message : '退出群聊失败');
    } finally {
      setActionPending(false);
    }
  };

  const handleDismiss = async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      const response = await groupService.dismissGroup({ groupId });
      if (response.success) afterRemoval();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解散群聊失败');
    } finally {
      setActionPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>群资料</DialogTitle>
          <DialogDescription>查看群信息与成员</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Spinner />
            加载中...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              重试
            </Button>
          </div>
        ) : !group ? (
          <div className="p-8 text-center text-sm text-muted-foreground">群信息不存在</div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <ChatAvatar
                id={group.id ?? groupId}
                title={group.name}
                avatarUrl={group.avatarUrl}
                alt={group.name ?? ''}
                className="size-14 shrink-0"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="truncate text-base font-semibold">{group.name}</h3>
                <span className="text-xs text-muted-foreground">
                  创建于 {formatCompactTime(Number(group.createTime ?? 0))}
                </span>
              </div>
            </div>

            {group.notice ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{group.notice}</p>
            ) : null}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">成员</span>
              <Badge variant="secondary">{members.length}</Badge>
            </div>

            <ScrollArea className="h-56 rounded-md border border-border">
              <div className="flex flex-col">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 px-3 py-2">
                    <ChatAvatar
                      id={member.userId ?? ''}
                      title={member.alias || member.nickname}
                      avatarUrl={member.avatarUrl}
                      alt={member.nickname ?? ''}
                      className="size-9 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {member.alias || member.nickname}
                    </span>
                    {roleLabel(member.role) ? (
                      <Badge variant="outline">{roleLabel(member.role)}</Badge>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex flex-col gap-2">
              {isOwner ? (
                <>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditOpen(true)}>
                      编辑群资料
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setInviteOpen(true)}
                    >
                      邀请成员
                    </Button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={actionPending}>
                        解散群聊
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>解散群聊</AlertDialogTitle>
                        <AlertDialogDescription>
                          解散后该群将被移除且无法恢复，确认解散？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            void handleDismiss();
                          }}
                        >
                          确认解散
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={actionPending}>
                      退出群聊
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>退出群聊</AlertDialogTitle>
                      <AlertDialogDescription>
                        退出后将不再接收该群消息，确认退出？
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleLeave();
                        }}
                      >
                        确认退出
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )}

        {group && isOwner ? (
          <>
            <GroupEditDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              group={group}
              onUpdated={load}
            />
            <GroupInviteDialog
              open={inviteOpen}
              onOpenChange={setInviteOpen}
              groupId={groupId}
              existingMemberIds={existingMemberIds}
              onInvited={load}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
