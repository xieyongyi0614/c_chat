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
  Spinner,
  Alert,
  AlertDescription,
} from '@c_chat/ui';
import { groupService } from '@/lib/services';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { MemberSelect } from './MemberSelect';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_MEMBERS = 2;

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const selectConversation = useConversationStore((state) => state.selectConversation);

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setMemberIds([]);
    setError('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (memberIds.length < MIN_MEMBERS || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const conversation = await groupService.createGroup({
        name: name.trim() || undefined,
        memberIds,
        avatarUrl: undefined,
      });
      selectConversation(conversation.id);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建群聊失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建群聊</DialogTitle>
          <DialogDescription>选择成员发起群聊，至少选择 {MIN_MEMBERS} 人</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">群名称（可选）</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="输入群名称"
            />
          </div>
          <MemberSelect selectedIds={memberIds} onChange={setMemberIds} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={memberIds.length < MIN_MEMBERS || submitting}
            onClick={() => {
              void submit();
            }}
          >
            {submitting && <Spinner data-icon="inline-start" />}
            {submitting ? '创建中' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
