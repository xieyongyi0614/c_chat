'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  ChatAvatar,
  Input,
  Label,
  Spinner,
  Alert,
  AlertDescription,
} from '@c_chat/ui';
import { authService } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [nickname, setNickname] = useState(userInfo?.nickname || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authService.updateUserProfile({ nickname });
      const updated = await authService.getUserInfo();
      setUserInfo(updated);
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>个人资料</DialogTitle>
          <DialogDescription>编辑你的个人信息</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>更新成功</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col items-center gap-4">
            <ChatAvatar
              id={userInfo?.id ?? ''}
              title={userInfo?.nickname || userInfo?.email}
              avatarUrl={userInfo?.avatarUrl}
              className="size-20"
              fallbackClassName="text-lg"
            />
            <p className="text-sm text-muted-foreground">{userInfo?.email}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称"
              required
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Spinner />}
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
