'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ChatProfileDialog } from '@c_chat/ui';
import { authService, uploadProfileImage } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';
import { useLightboxStore } from '@/lib/stores/lightbox.store';
import { formatFileUrl } from '@/lib/media/formatFileUrl';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    conversations: number;
    unread: number;
    groups: number;
  };
}

export function UserProfileDialog({ open, onOpenChange, stats }: UserProfileDialogProps) {
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [nickname, setNickname] = useState(userInfo?.nickname || '');
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAvatarPreview = (avatarUrl: string) => {
    useLightboxStore.getState().openPreview({
      items: [
        {
          id: userInfo?.id ?? 'profile-avatar',
          type: 'image',
          fileUrl: avatarUrl,
          fileName: userInfo?.nickname || userInfo?.email || 'avatar',
          createTime: Date.now(),
          senderId: userInfo?.id,
        },
      ],
      initialIndex: 0,
    });
  };

  useEffect(() => {
    if (open) {
      setNickname(userInfo?.nickname || '');
    }
  }, [open, userInfo?.nickname]);

  const handleSave = async () => {
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

  const handleSelectAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setSuccess(false);
    setAvatarUploading(true);
    try {
      const avatarUrl = await uploadProfileImage(file);
      await authService.updateUserProfile({ avatarUrl });
      const updated = await authService.getUserInfo();
      setUserInfo(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '头像更新失败');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <ChatProfileDialog
        open={open}
        onOpenChange={onOpenChange}
        profile={{
          id: userInfo?.id ?? '',
          nickname: userInfo?.nickname || userInfo?.email,
          avatarUrl: formatFileUrl(userInfo?.avatarUrl),
        }}
        draftNickname={nickname}
        email={userInfo?.email}
        stats={[
          { id: 'conversations', label: '会话', value: stats.conversations },
          { id: 'unread', label: '未读', value: stats.unread },
          { id: 'groups', label: '群组', value: stats.groups },
        ]}
        error={error}
        success={success ? '更新成功' : undefined}
        saving={loading || avatarUploading}
        onNicknameChange={setNickname}
        onAvatarPreview={openAvatarPreview}
        onSelectAvatar={handleSelectAvatar}
        onSave={handleSave}
        labels={{
          title: '账号资料',
        }}
      />
    </>
  );
}
