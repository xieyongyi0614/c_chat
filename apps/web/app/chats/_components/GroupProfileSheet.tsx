'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChatGroupDetailDialog,
  type ChatGroupDraft,
  type ChatGroupInfo,
} from '@c_chat/ui';
import { formatCompactTime } from '@c_chat/shared-utils';
import type { IGroupInfo, IGroupMemberInfo } from '@c_chat/shared-protobuf';
import { groupService, uploadProfileImage } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';
import { useConversationStore } from '@/lib/stores/conversation.store';
import { useLightboxStore } from '@/lib/stores/lightbox.store';
import { formatFileUrl } from '@/lib/media/formatFileUrl';
import { GroupInviteDialog } from './GroupInviteDialog';

interface GroupProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function GroupProfileSheet({ open, onOpenChange, groupId }: GroupProfileSheetProps) {
  const currentUserId = useUserStore((state) => state.userInfo?.id);
  const selectConversation = useConversationStore((state) => state.selectConversation);
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId);

  const [group, setGroup] = useState<IGroupInfo | null>(null);
  const [members, setMembers] = useState<IGroupMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<ChatGroupDraft>({ name: '', avatarUrl: '', notice: '' });
  const [actionPending, setActionPending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setLoaded(false);
    groupService
      .getGroupDetail({ groupId })
      .then((detail) => {
        const nextGroup = detail.group ?? null;
        setGroup(nextGroup);
        setMembers(detail.members ?? []);
        setDraft({
          name: nextGroup?.name ?? '',
          avatarUrl: nextGroup?.avatarUrl ?? '',
          notice: nextGroup?.notice ?? '',
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载群详情失败');
      })
      .finally(() => {
        setLoading(false);
        setLoaded(true);
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

  const handleSave = async () => {
    if (saving || !group?.id) return;

    setSaving(true);
    setError('');
    try {
      const response = await groupService.updateGroup({
        groupId: group.id,
        name: draft.name.trim() || undefined,
        avatarUrl: draft.avatarUrl.trim() || undefined,
        notice: draft.notice.trim() || undefined,
      });
      if (!response.success) {
        throw new Error('更新群资料失败');
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新群资料失败');
    } finally {
      setSaving(false);
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

  const openAvatarPreview = (avatarUrl: string, id: string, name?: string | null) => {
    useLightboxStore.getState().openPreview({
      items: [
        {
          id,
          type: 'image',
          fileUrl: avatarUrl,
          fileName: name || 'avatar',
          createTime: Date.now(),
        },
      ],
      initialIndex: 0,
    });
  };

  const uiGroup: ChatGroupInfo | null = group
    ? {
        id: group.id,
        name: group.name,
        avatarUrl: formatFileUrl(group.avatarUrl),
        notice: group.notice,
        ownerId: group.ownerId,
        createTimeLabel: `创建于 ${formatCompactTime(Number(group.createTime ?? 0))}`,
      }
    : null;
  const detailLoading = loading || (open && !loaded && !error);
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
      <ChatGroupDetailDialog
        open={open}
        onOpenChange={onOpenChange}
        group={uiGroup}
        members={members.map((member) => ({
          userId: member.userId,
          nickname: member.nickname,
          avatarUrl: formatFileUrl(member.avatarUrl),
          role: member.role,
          alias: member.alias,
        }))}
        loading={detailLoading}
        loadError={error}
        isOwner={isOwner}
        saving={saving || avatarUploading}
        draft={uiDraft}
        inlineEdit
        actionPending={actionPending}
        onDraftChange={(nextDraft) =>
          setDraft((current) => ({ ...nextDraft, avatarUrl: current.avatarUrl }))
        }
        onRetry={load}
        onSave={handleSave}
        onOpenInvite={() => setInviteOpen(true)}
        onAvatarPreview={(avatarUrl) =>
          openAvatarPreview(avatarUrl, group?.id ?? groupId, group?.name)
        }
        onMemberAvatarPreview={(member) =>
          openAvatarPreview(
            member.avatarUrl ?? '',
            member.userId ?? 'member-avatar',
            member.nickname || member.alias || member.userId,
          )
        }
        onSelectAvatar={handleSelectAvatar}
        onLeave={handleLeave}
        onDismiss={handleDismiss}
      />

      {group && isOwner ? (
        <GroupInviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          groupId={groupId}
          existingMemberIds={existingMemberIds}
          onInvited={load}
        />
      ) : null}
    </>
  );
}
