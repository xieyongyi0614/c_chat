import { memo, useMemo, useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from '@c_chat/ui';
import { useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import { ipc, to } from '@c_chat/shared-utils';
import { toast } from 'sonner';
import TextMessage from './types/TextMessage';
import ImageGroup from './types/ImageGroup';
import FileMessage from './types/FileMessage';
import VideoMessage from './types/VideoMessage';
import AudioMessage from './types/AudioMessage';
import MessageDate from './MessageDate';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import { MessageStatusEnum } from '@c_chat/shared-types';
import type { SenderProfile } from './senderProfile';

interface MessageItemProps {
  isRead: boolean;
  groupId: string;
  isGroupConversation?: boolean;
  senderProfiles?: Record<string, SenderProfile>;
}

const getInitials = (value?: string | null) => {
  const text = value?.trim();
  if (!text) return '?';
  return text.slice(0, 2).toUpperCase();
};

const MessageItem = ({
  isRead,
  groupId,
  isGroupConversation,
  senderProfiles,
}: MessageItemProps) => {
  const userInfo = useUserStore((s) => s.userInfo);
  const userId = userInfo?.id;
  const messages = useMessageStore((s) => s.msgMap[groupId]) ?? [];
  const updateMsgs = useMessageStore((s) => s.updateMsgs);
  const [profileOpen, setProfileOpen] = useState(false);
  const [resending, setResending] = useState(false);

  const msg = messages[0];
  const isMe = msg.senderId === userId;
  const sender = useMemo<SenderProfile>(() => {
    if (isMe) {
      return {
        id: userInfo?.id ?? msg.senderId,
        nickname: userInfo?.nickname ?? userInfo?.email ?? msg.senderNickname,
        avatarUrl: userInfo?.avatarUrl ?? msg.senderAvatar,
        email: userInfo?.email ?? msg.senderEmail,
      };
    }

    const profile = senderProfiles?.[msg.senderId];
    return {
      id: msg.senderId,
      nickname: msg.senderNickname || profile?.nickname || msg.senderEmail || '未知成员',
      avatarUrl: msg.senderAvatar || profile?.avatarUrl || '',
      email: msg.senderEmail || profile?.email || '',
    };
  }, [
    isMe,
    msg.senderAvatar,
    msg.senderEmail,
    msg.senderId,
    msg.senderNickname,
    senderProfiles,
    userInfo,
  ]);
  const senderName = sender.nickname || sender.email || sender.id;
  const showSender = Boolean(isGroupConversation);
  const isVideoMessage = msg.type === MESSAGE_TYPE.Video;
  const failedOwnMessages = isMe
    ? messages.filter((item) => item.status === MessageStatusEnum.fail && item.clientMsgId)
    : [];

  const handleResend = async () => {
    if (failedOwnMessages.length === 0 || resending) return;

    setResending(true);
    updateMsgs(
      failedOwnMessages.map((item) => ({
        ...item,
        status: MessageStatusEnum.sending,
        updateTime: Date.now(),
      })),
    );

    const nextMessages = [];

    for (const item of failedOwnMessages) {
      const [err, res] = await to(ipc.ResendMessage({ clientMsgId: item.clientMsgId }));
      if (err) {
        console.error('Failed to resend message:', err);
        updateMsgs(
          failedOwnMessages.map((failedItem) => ({
            ...failedItem,
            status: MessageStatusEnum.fail,
            updateTime: Date.now(),
          })),
        );
        toast.error('重发失败');
        setResending(false);
        return;
      }
      nextMessages.push(...res);
    }

    updateMsgs(nextMessages);
    setResending(false);
  };

  const renderContent = () => {
    if (msg.type === MESSAGE_TYPE.Image) {
      return (
        <ImageGroup
          messages={messages}
          isMe={isMe}
          isRead={isRead}
          onRetry={handleResend}
          retrying={resending}
        />
      );
    }

    if (messages.length !== 1) {
      return <TextMessage content="消息错误" />;
    }

    if (msg.type === MESSAGE_TYPE.File) {
      return (
        <FileMessage
          msg={msg}
          isMe={isMe}
          isRead={isRead}
          onRetry={handleResend}
          retrying={resending}
        />
      );
    }

    if (msg.type === MESSAGE_TYPE.Video) {
      return (
        <VideoMessage
          msg={msg}
          isMe={isMe}
          isRead={isRead}
          onRetry={handleResend}
          retrying={resending}
        />
      );
    }

    if (msg.type === MESSAGE_TYPE.Audio) {
      return (
        <AudioMessage
          audioUrl={msg.fileUrl ?? ''}
          isMe={isMe}
          voice={{
            waveform: msg.waveform ?? '',
            duration: msg.duration ?? 0,
          }}
          msg={msg}
          onRetry={handleResend}
          retrying={resending}
        />
      );
    }

    return <TextMessage content={msg.content || '未知消息'} />;
  };

  return (
    <div className={cn('flex w-full items-end gap-2', isMe ? 'justify-end' : 'justify-start')}>
      {showSender && !isMe && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full p-0"
          onClick={() => setProfileOpen(true)}
        >
          <Avatar className="size-9">
            <AvatarImage src={formatFileUrl(sender.avatarUrl ?? '')} alt={senderName} />
            <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
          </Avatar>
        </Button>
      )}

      <div className={cn('relative flex max-w-[70%] flex-col', isMe ? 'items-end' : 'items-start')}>
        {showSender && !isMe && (
          <button
            type="button"
            className="mb-1 max-w-full truncate px-1 text-xs text-muted-foreground"
            onClick={() => setProfileOpen(true)}
          >
            {senderName}
          </button>
        )}
        <div
          className={cn(
            'rounded-2xl py-2 text-sm',
            isMe ? 'rounded-br-sm pl-3 pr-2' : 'rounded-bl-sm bg-muted pl-2 pr-3',
            msg.type === MESSAGE_TYPE.Image ? 'relative group' : 'shadow-sm',
            isVideoMessage && 'bg-transparent p-0 shadow-none',
          )}
        >
          {renderContent()}
          {msg.type === MESSAGE_TYPE.Text && (
            <MessageDate
              time={msg.createTime}
              status={msg.status}
              isMe={isMe}
              isRead={isRead}
              onRetry={handleResend}
              retrying={resending}
              className="relative top-1.5"
            />
          )}
        </div>
      </div>

      {showSender && isMe && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full p-0"
          onClick={() => setProfileOpen(true)}
        >
          <Avatar className="size-9">
            <AvatarImage src={formatFileUrl(sender.avatarUrl ?? '')} alt={senderName} />
            <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
          </Avatar>
        </Button>
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>账号信息</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage src={formatFileUrl(sender.avatarUrl ?? '')} alt={senderName} />
              <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold">{senderName}</span>
                {isMe && <Badge variant="secondary">我</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{sender.email || sender.id}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(MessageItem);
