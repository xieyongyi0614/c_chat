'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Spinner,
  Alert,
  AlertDescription,
} from '@c_chat/ui';
import { groupService } from '@/lib/services';
import { MemberSelect } from './MemberSelect';

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
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMemberIds([]);
      setError('');
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (memberIds.length === 0 || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await groupService.inviteGroupMembers({ groupId, memberIds });
      if (!response.success) {
        throw new Error('邀请成员失败');
      }
      setMemberIds([]);
      onInvited();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '邀请成员失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀请成员</DialogTitle>
          <DialogDescription>选择要加入群聊的成员</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <MemberSelect
            selectedIds={memberIds}
            onChange={setMemberIds}
            excludeIds={existingMemberIds}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={memberIds.length === 0 || submitting}
            onClick={() => {
              void submit();
            }}
          >
            {submitting && <Spinner data-icon="inline-start" />}
            {submitting ? '邀请中' : '邀请'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
