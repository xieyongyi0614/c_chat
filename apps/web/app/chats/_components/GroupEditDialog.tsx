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
  Input,
  Label,
  Textarea,
  Spinner,
  Alert,
  AlertDescription,
} from '@c_chat/ui';
import type { IGroupInfo } from '@c_chat/shared-protobuf';
import { groupService } from '@/lib/services';

interface GroupEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: IGroupInfo;
  onUpdated: () => void;
}

export function GroupEditDialog({ open, onOpenChange, group, onUpdated }: GroupEditDialogProps) {
  const [name, setName] = useState(group.name ?? '');
  const [notice, setNotice] = useState(group.notice ?? '');
  const [avatarUrl, setAvatarUrl] = useState(group.avatarUrl ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (submitting || !group.id) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await groupService.updateGroup({
        groupId: group.id,
        name: name.trim() || undefined,
        notice: notice.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      if (!response.success) {
        throw new Error('更新群资料失败');
      }
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新群资料失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑群资料</DialogTitle>
          <DialogDescription>修改群名称、头像与公告</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-group-name">群名称</Label>
            <Input
              id="edit-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="输入群名称"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-group-avatar">群头像链接</Label>
            <Input
              id="edit-group-avatar"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="输入头像图片链接"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-group-notice">群公告</Label>
            <Textarea
              id="edit-group-notice"
              value={notice}
              onChange={(event) => setNotice(event.target.value)}
              placeholder="输入群公告"
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={submitting}
            onClick={() => {
              void submit();
            }}
          >
            {submitting && <Spinner data-icon="inline-start" />}
            {submitting ? '保存中' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
