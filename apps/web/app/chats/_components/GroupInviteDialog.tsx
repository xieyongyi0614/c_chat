'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChatGroupInviteDialog,
  type ChatGroupInviteUser,
} from '@c_chat/ui';
import type { UserTypes } from '@c_chat/shared-types';
import { authService, groupService } from '@/lib/services';
import { formatFileUrl } from '@/lib/media/formatFileUrl';

interface GroupInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  existingMemberIds: string[];
  onInvited: () => void;
}

export function GroupInviteDialog({
  open,
  onOpenChange,
  groupId,
  existingMemberIds,
  onInvited,
}: GroupInviteDialogProps) {
  const [users, setUsers] = useState<UserTypes.UserListItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserTypes.UserListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setError('');
    authService
      .getUserList({ word: '', pagination: { page: 1, pageSize: 30 } })
      .then((res) => {
        setUsers(res.list);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载用户失败');
      });
  }, [open]);

  const visibleUsers = useMemo(() => {
    const excluded = new Set(existingMemberIds);
    return users.filter((user) => !excluded.has(user.id));
  }, [existingMemberIds, users]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedUsers([]);
      setError('');
    }
    onOpenChange(next);
  };

  const toggleUser = (user: ChatGroupInviteUser) => {
    const matchedUser = users.find((item) => item.id === user.id);
    if (!matchedUser) return;

    setSelectedUsers((current) =>
      current.some((item) => item.id === matchedUser.id)
        ? current.filter((item) => item.id !== matchedUser.id)
        : [...current, matchedUser],
    );
  };

  const submit = async () => {
    if (selectedUsers.length === 0 || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await groupService.inviteGroupMembers({
        groupId,
        memberIds: selectedUsers.map((user) => user.id),
      });
      if (!response.success) {
        throw new Error('邀请成员失败');
      }
      setSelectedUsers([]);
      onInvited();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '邀请成员失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ChatGroupInviteDialog
      open={open}
      onOpenChange={handleOpenChange}
      users={visibleUsers.map(toInviteUser)}
      selectedUsers={selectedUsers.map(toInviteUser)}
      onToggleUser={toggleUser}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    />
  );
}

const toInviteUser = (user: UserTypes.UserListItem): ChatGroupInviteUser => ({
  id: user.id,
  email: user.email,
  nickname: user.nickname,
  avatarUrl: formatFileUrl(user.avatarUrl),
});
