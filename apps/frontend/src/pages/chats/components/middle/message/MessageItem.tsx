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
import TextMessage from './types/TextMessage';
import ImageGroup from './types/ImageGroup';
import FileMessage from './types/FileMessage';
import VideoMessage from './types/VideoMessage';
import AudioMessage from './types/AudioMessage';

import MessageDate from './MessageDate';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
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
  const messages = useMessageStore((s) => s.msgMap[groupId]);
  const [profileOpen, setProfileOpen] = useState(false);

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

  const renderContent = () => {
    if (msg.type === MESSAGE_TYPE.Image) {
      return <ImageGroup messages={messages} />;
    }

    if (messages.length !== 1) {
      return <TextMessage content="消息错误" />;
    }

    if (msg.type === MESSAGE_TYPE.File) {
      return <FileMessage msg={msg} isMe={isMe} isRead={isRead} />;
    }

    if (msg.type === MESSAGE_TYPE.Video) {
      return <VideoMessage msg={msg} isMe={isMe} isRead={isRead} />;
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

      <div className={cn('flex max-w-[70%] flex-col', isMe ? 'items-end' : 'items-start')}>
        {showSender && !isMe && (
          <button
            type="button"
            className="text-muted-foreground mb-1 max-w-full truncate px-1 text-xs"
            onClick={() => setProfileOpen(true)}
          >
            {senderName}
          </button>
        )}
        <div
          className={cn(
            'rounded-2xl py-2 text-sm',
            isMe ? 'rounded-br-sm pl-3 pr-2' : 'bg-muted rounded-bl-sm pl-2 pr-3',
            msg.type === MESSAGE_TYPE.Image ? 'relative group' : 'shadow-sm',
          )}
        >
          {renderContent()}
          {msg.type === MESSAGE_TYPE.Text && (
            <MessageDate
              time={msg.createTime}
              status={msg.status}
              isMe={isMe}
              isRead={isRead}
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
              <p className="text-muted-foreground truncate text-sm">{sender.email || sender.id}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(MessageItem);
