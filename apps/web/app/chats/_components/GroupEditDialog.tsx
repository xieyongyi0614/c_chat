'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ChatGroupEditDialog, type ChatGroupDraft } from '@c_chat/ui';
import type { IGroupInfo } from '@c_chat/shared-protobuf';
import { groupService, uploadProfileImage } from '@/lib/services';
import { useLightboxStore } from '@/lib/stores/lightbox.store';
import { formatFileUrl } from '@/lib/media/formatFileUrl';

interface GroupEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: IGroupInfo;
  onUpdated: () => void;
}

export function GroupEditDialog({ open, onOpenChange, group, onUpdated }: GroupEditDialogProps) {
  const [draft, setDraft] = useState<ChatGroupDraft>({
    name: group.name ?? '',
    notice: group.notice ?? '',
    avatarUrl: group.avatarUrl ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: group.name ?? '',
      notice: group.notice ?? '',
      avatarUrl: group.avatarUrl ?? '',
    });
    setError('');
  }, [group.avatarUrl, group.name, group.notice, open]);

  const submit = async () => {
    if (submitting || !group.id) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await groupService.updateGroup({
        groupId: group.id,
        name: draft.name.trim() || undefined,
        notice: draft.notice.trim() || undefined,
        avatarUrl: draft.avatarUrl.trim() || undefined,
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

  const handleSelectAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarUploading(true);
    setError('');
    try {
      const avatarUrl = await uploadProfileImage(file);
      setDraft((current) => ({ ...current, avatarUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '群头像上传失败');
    } finally {
      setAvatarUploading(false);
    }
  };

  const openAvatarPreview = (avatarUrl: string) => {
    useLightboxStore.getState().openPreview({
      items: [
        {
          id: group.id ?? 'group-avatar',
          type: 'image',
          fileUrl: avatarUrl,
          fileName: draft.name || group.name || 'avatar',
          createTime: Date.now(),
        },
      ],
      initialIndex: 0,
    });
  };

  const uiDraft: ChatGroupDraft = {
    ...draft,
    avatarUrl: formatFileUrl(draft.avatarUrl),
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
      <ChatGroupEditDialog
        open={open}
        onOpenChange={onOpenChange}
        draft={uiDraft}
        onDraftChange={(nextDraft) =>
          setDraft((current) => ({ ...nextDraft, avatarUrl: current.avatarUrl }))
        }
        onSubmit={submit}
        submitting={submitting || avatarUploading}
        error={error}
        groupId={group.id ?? undefined}
        onSelectAvatar={handleSelectAvatar}
        onAvatarPreview={openAvatarPreview}
      />
    </>
  );
}
