import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type {
  GetGroupDetailResult,
  LocalConversationListItem,
  UserTypes,
} from '@c_chat/shared-types';
import { ipc, to } from '@c_chat/shared-utils';
import {
  ChatGroupDetailDialog,
  ChatGroupInviteDialog,
  type ChatGroupDraft,
  type ChatGroupInviteUser,
} from '@c_chat/ui';
import { MAX_GROUP_NAME_LENGTH } from '../group-name';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';

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
  const [draft, setDraft] = useState<ChatGroupDraft>({ name: '', avatarUrl: '', notice: '' });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const group = detail?.group;
  const members = useMemo(() => detail?.members ?? [], [detail?.members]);
  const detailLoading = loading || (open && Boolean(conversation?.targetId) && !detail && !loadError);
  const isOwner = Boolean(group?.ownerId && group.ownerId === userId);
  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const inviteCandidates = userList.filter((user) => !memberIds.has(user.id));

  const applyDetail = useCallback(
    (res: GetGroupDetailResult) => {
      setLoadError('');
      setDetail(res);
      setDraft({
        name: res.group?.name ?? conversation?.targetName ?? '',
        avatarUrl: res.group?.avatarUrl ?? conversation?.targetAvatar ?? '',
        notice: res.group?.notice ?? '',
      });
    },
    [conversation?.targetAvatar, conversation?.targetName],
  );

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

  const refreshDetail = async () => {
    if (!conversation?.targetId) return;
    const [err, res] = await to(ipc.GetGroupDetail({ groupId: conversation.targetId }));
    if (!err) {
      applyDetail(res);
    }
  };

  useEffect(() => {
    if (!open || !conversation?.targetId) return;

    const load = async () => {
      setLoading(true);
      const [err, res] = await to(ipc.GetGroupDetail({ groupId: conversation.targetId }));
      setLoading(false);

      if (err) {
        setLoadError(err instanceof Error ? err.message : '获取群资料失败');
        toast.error('获取群资料失败');
        return;
      }

      applyDetail(res);
    };

    void load();
  }, [applyDetail, conversation?.targetId, open]);

  useEffect(() => {
    if ((!open && !inviteOpen) || !isOwner) return;

    const loadUsers = async () => {
      const [err, res] = await to(ipc.GetUserList({ word: '' }));
      if (!err) {
        setUserList(res.list ?? []);
      }
    };

    void loadUsers();
  }, [inviteOpen, isOwner, open]);

  const toggleInviteUser = (user: UserTypes.UserListItem) => {
    setSelectedInviteUsers((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  const handleSave = async () => {
    if (!conversation?.targetId) return;
    const trimmedName = draft.name.trim().slice(0, MAX_GROUP_NAME_LENGTH);

    setSaving(true);
    const [err, res] = await to(
      ipc.UpdateGroup({
        groupId: conversation.targetId,
        name: trimmedName,
        avatarUrl: draft.avatarUrl,
        notice: draft.notice,
      }),
    );
    setSaving(false);

    if (err || !res.success) {
      toast.error(err instanceof Error ? err.message : '更新群资料失败');
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
    void refreshDetail();
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
      toast.error(err instanceof Error ? err.message : '邀请成员失败');
      return;
    }

    setSelectedInviteUsers([]);
    toast.success('已邀请成员');
    void refreshDetail();
    setInviteOpen(false);
  };

  const handleLeave = async () => {
    if (!conversation?.targetId) return;

    const [err, res] = await to(ipc.LeaveGroup({ groupId: conversation.targetId }));
    if (err || !res.success) {
      toast.error(err instanceof Error ? err.message : '退出群聊失败');
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
      toast.error(err instanceof Error ? err.message : '解散群聊失败');
      return;
    }

    removeConversation(conversation.id);
    onOpenChange(false);
    toast.success('群聊已解散');
  };

  const handleSelectAvatar = async () => {
    if (!conversation?.targetId) return;

    const files = await ipc.SelectFiles({
      allowMultiSelect: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });
    const file = files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const [err, res] = await to(
      ipc.UpdateGroup({
        groupId: conversation.targetId,
        avatarFilePath: file.filePath,
      }),
    );
    setAvatarUploading(false);

    if (err || !res.success) {
      toast.error(err instanceof Error ? err.message : '群头像更新失败');
      return;
    }

    if (res.group) {
      setDraft((current) => ({
        ...current,
        avatarUrl: res.group?.avatarUrl ?? current.avatarUrl,
      }));
      upsertAndPinConversation({
        ...conversation,
        targetName: res.group.name ?? conversation.targetName,
        targetAvatar: res.group.avatarUrl ?? conversation.targetAvatar,
        updateTime: Number(res.group.updateTime ?? conversation.updateTime),
      });
    }
    toast.success('群头像已更新');
    void refreshDetail();
  };

  const openAvatarPreview = (avatarUrl: string, id: string, name?: string | null) => {
    void ipc.OpenMediaPreview({
      items: [
        {
          id,
          type: 'image',
          fileUrl: formatFileUrl(avatarUrl),
          fileName: name || 'avatar',
          createTime: Date.now(),
        },
      ],
      initialIndex: 0,
    });
  };

  const uiGroup = detail
    ? (group ?? {
        id: conversation?.targetId ?? conversation?.id,
        name: conversation?.targetName,
        avatarUrl: conversation?.targetAvatar,
      })
    : null;
  const displayGroup = uiGroup
    ? {
        ...uiGroup,
        avatarUrl: formatFileUrl(uiGroup.avatarUrl),
      }
    : null;

  return (
    <>
      <ChatGroupDetailDialog
        open={open}
        onOpenChange={handleGroupDialogOpenChange}
        group={displayGroup}
        members={members.map((member) => ({
          ...member,
          avatarUrl: formatFileUrl(member.avatarUrl),
        }))}
        loading={detailLoading}
        loadError={loadError}
        isOwner={isOwner}
        saving={saving || avatarUploading}
        draft={{
          ...draft,
          avatarUrl: formatFileUrl(draft.avatarUrl),
        }}
        maxNameLength={MAX_GROUP_NAME_LENGTH}
        inlineEdit
        onDraftChange={(nextDraft) =>
          setDraft((current) => ({ ...nextDraft, avatarUrl: current.avatarUrl }))
        }
        onRetry={refreshDetail}
        onSave={handleSave}
        onOpenInvite={() => setInviteOpen(true)}
        onAvatarPreview={(avatarUrl) =>
          openAvatarPreview(avatarUrl, group?.id ?? conversation?.targetId ?? 'group-avatar', group?.name)
        }
        onMemberAvatarPreview={(member) =>
          openAvatarPreview(
            member.avatarUrl ?? '',
            member.userId ?? 'member-avatar',
            member.nickname || member.alias || member.userId,
          )
        }
        onLeave={handleLeave}
        onDismiss={handleDismiss}
        onSelectAvatar={handleSelectAvatar}
      />

      <ChatGroupInviteDialog
        open={inviteOpen}
        onOpenChange={handleInviteDialogOpenChange}
        users={inviteCandidates.map(toInviteUser)}
        selectedUsers={selectedInviteUsers.map(toInviteUser)}
        onToggleUser={(user) => {
          const matchedUser = userList.find((item) => item.id === user.id);
          if (matchedUser) toggleInviteUser(matchedUser);
        }}
        onSubmit={handleInvite}
        submitting={saving}
      />
    </>
  );
}

const toInviteUser = (user: UserTypes.UserListItem): ChatGroupInviteUser => ({
  id: user.id,
  email: user.email,
  nickname: user.nickname,
  avatarUrl: user.avatarUrl,
});
