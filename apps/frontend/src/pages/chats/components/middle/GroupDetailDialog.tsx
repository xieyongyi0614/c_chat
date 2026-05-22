import { useEffect, useMemo, useState } from 'react';
import { Shield, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type {
  GetGroupDetailResult,
  LocalConversationListItem,
  UserTypes,
} from '@c_chat/shared-types';
import { ipc, to } from '@c_chat/shared-utils';
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Separator,
  Textarea,
} from '@c_chat/ui';
import { MAX_GROUP_NAME_LENGTH } from '../group-name';

interface GroupDetailDialogProps {
  open: boolean;
  conversation: LocalConversationListItem | null;
  onOpenChange: (open: boolean) => void;
}

export function GroupDetailDialog({ open, conversation, onOpenChange }: GroupDetailDialogProps) {
  const userId = useUserStore((state) => state.userInfo?.id);
  const upsertAndPinConversation = useChatStore((state) => state.upsertAndPinConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);

  const [detail, setDetail] = useState<GetGroupDetailResult | null>(null);
  const [userList, setUserList] = useState<UserTypes.UserListItem[]>([]);
  const [selectedInviteUsers, setSelectedInviteUsers] = useState<UserTypes.UserListItem[]>([]);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const group = detail?.group;
  const members = useMemo(() => detail?.members ?? [], [detail?.members]);
  const isOwner = Boolean(group?.ownerId && group.ownerId === userId);
  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const inviteCandidates = userList.filter((user) => !memberIds.has(user.id));
  const handleGroupDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setInviteOpen(false);
      setSelectedInviteUsers([]);
    }
  };
  const handleInviteDialogOpenChange = (nextOpen: boolean) => {
    setInviteOpen(nextOpen);
    if (!nextOpen) {
      setSelectedInviteUsers([]);
    }
  };

  useEffect(() => {
    if (!open || !conversation?.targetId) return;

    const load = async () => {
      setLoading(true);
      const [err, res] = await to(ipc.GetGroupDetail({ groupId: conversation.targetId }));
      setLoading(false);

      if (err) {
        toast.error('获取群资料失败');
        return;
      }

      setDetail(res);
      setName(res.group?.name ?? conversation.targetName ?? '');
      setAvatarUrl(res.group?.avatarUrl ?? conversation.targetAvatar ?? '');
      setNotice(res.group?.notice ?? '');
    };

    load();
  }, [conversation?.targetAvatar, conversation?.targetId, conversation?.targetName, open]);

  useEffect(() => {
    if ((!open && !inviteOpen) || !isOwner) return;

    const loadUsers = async () => {
      const [err, res] = await to(ipc.GetUserList({ word: '' }));
      if (!err) {
        setUserList(res.list ?? []);
      }
    };

    loadUsers();
  }, [inviteOpen, isOwner, open]);

  const refreshDetail = async () => {
    if (!conversation?.targetId) return;
    const [err, res] = await to(ipc.GetGroupDetail({ groupId: conversation.targetId }));
    if (!err) {
      setDetail(res);
      setName(res.group?.name ?? '');
      setAvatarUrl(res.group?.avatarUrl ?? '');
      setNotice(res.group?.notice ?? '');
    }
  };

  const toggleInviteUser = (user: UserTypes.UserListItem) => {
    setSelectedInviteUsers((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  const handleSave = async () => {
    if (!conversation?.targetId) return;
    const trimmedName = name.trim().slice(0, MAX_GROUP_NAME_LENGTH);

    setSaving(true);
    const [err, res] = await to(
      ipc.UpdateGroup({
        groupId: conversation.targetId,
        name: trimmedName,
        avatarUrl,
        notice,
      }),
    );
    setSaving(false);

    if (err || !res.success) {
      toast.error('更新群资料失败');
      return;
    }

    if (res.group) {
      upsertAndPinConversation({
        ...conversation,
        targetName: res.group.name ?? conversation.targetName,
        targetAvatar: res.group.avatarUrl ?? conversation.targetAvatar,
        updateTime: Number(res.group.updateTime ?? conversation.updateTime),
      });
    }
    toast.success('群资料已更新');
    refreshDetail();
  };

  const handleInvite = async () => {
    if (!conversation?.targetId || selectedInviteUsers.length === 0) return;

    setSaving(true);
    const [err, res] = await to(
      ipc.InviteGroupMembers({
        groupId: conversation.targetId,
        memberIds: selectedInviteUsers.map((user) => user.id),
      }),
    );
    setSaving(false);

    if (err || !res.success) {
      toast.error('邀请成员失败');
      return;
    }

    setSelectedInviteUsers([]);
    toast.success('已邀请成员');
    refreshDetail();
    setInviteOpen(false);
  };

  const handleLeave = async () => {
    if (!conversation?.targetId) return;

    const [err, res] = await to(ipc.LeaveGroup({ groupId: conversation.targetId }));
    if (err || !res.success) {
      toast.error('退出群聊失败');
      return;
    }

    removeConversation(conversation.id);
    onOpenChange(false);
    toast.success('已退出群聊');
  };

  const handleDismiss = async () => {
    if (!conversation?.targetId) return;

    const [err, res] = await to(ipc.DismissGroup({ groupId: conversation.targetId }));
    if (err || !res.success) {
      toast.error('解散群聊失败');
      return;
    }

    removeConversation(conversation.id);
    onOpenChange(false);
    toast.success('群聊已解散');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleGroupDialogOpenChange}>
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] max-w-[560px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>群资料</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto pr-1">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={group?.avatarUrl ?? conversation?.targetAvatar ?? ''} />
                  <AvatarFallback>
                    {(group?.name ?? conversation?.targetName ?? '群').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold">
                      {group?.name ?? conversation?.targetName ?? '群聊'}
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      <UsersRound />
                      {members.length} 人
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {group?.notice || '暂无群公告'}
                  </p>
                </div>
              </div>

              <Separator />

              {isOwner && (
                <div className="flex flex-col gap-3">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={MAX_GROUP_NAME_LENGTH}
                    placeholder="群名称"
                  />
                  <Input
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="群头像 URL"
                  />
                  <Textarea
                    value={notice}
                    onChange={(event) => setNotice(event.target.value)}
                    placeholder="群公告"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setInviteOpen(true)}>
                      邀请成员
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>
                      保存群资料
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">成员</span>
                  {loading && <span className="text-xs text-muted-foreground">加载中...</span>}
                </div>
                <ScrollArea className="h-56 rounded-md border">
                  <div className="flex flex-col gap-1 p-2">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5"
                      >
                        <Avatar size="sm">
                          <AvatarImage src={member.avatarUrl ?? ''} />
                          <AvatarFallback>
                            {(member.nickname || member.userId || '?').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {member.nickname || member.userId}
                        </span>
                        {member.role === 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Shield />
                            群主
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-2">
                {!isOwner && (
                  <Button variant="outline" onClick={handleLeave}>
                    退出群聊
                  </Button>
                )}
                {isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">解散群聊</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认解散群聊？</AlertDialogTitle>
                        <AlertDialogDescription>
                          解散后所有成员将无法继续发送消息，会话也会从列表中移除。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDismiss}>
                          解散
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={handleInviteDialogOpenChange}>
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] max-w-[480px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto pr-1">
            <div className="flex flex-col gap-3">
              <div className="flex min-h-6 flex-wrap gap-2">
                {selectedInviteUsers.map((user) => (
                  <Badge key={user.id} onClick={() => toggleInviteUser(user)}>
                    {user.nickname || user.email}
                    <X data-icon="inline-end" />
                  </Badge>
                ))}
              </div>
              <Command className="rounded-lg border">
                <CommandInput placeholder="邀请成员..." />
                <CommandList className="max-h-[calc(100dvh-14rem)]">
                  <CommandEmpty>暂无可邀请成员</CommandEmpty>
                  <CommandGroup>
                    {inviteCandidates.map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => toggleInviteUser(user)}
                        className="flex cursor-pointer items-center justify-between"
                      >
                        <span>{user.nickname || user.email}</span>
                        {selectedInviteUsers.some((item) => item.id === user.id) && (
                          <Badge variant="secondary">已选</Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              取消
            </Button>
            <Button onClick={handleInvite} disabled={saving || selectedInviteUsers.length === 0}>
              邀请成员
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
