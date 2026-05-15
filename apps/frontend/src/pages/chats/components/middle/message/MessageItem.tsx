import { memo } from 'react';
import { cn } from '@c_chat/ui';
import { useMessageStore, useUserStore } from '@c_chat/frontend/stores';
import TextMessage from './types/TextMessage';
import ImageGroup from './types/ImageGroup';
import FileMessage from './types/FileMessage';
import VideoMessage from './types/VideoMessage';
import AudioMessage from './types/AudioMessage';

import MessageDate from './MessageDate';
import { MESSAGE_TYPE } from '@c_chat/shared-config';

interface MessageItemProps {
  isRead: boolean;
  groupId: string;
}

const MessageItem = ({ isRead, groupId }: MessageItemProps) => {
  const userId = useUserStore((s) => s.userInfo?.id);
  const messages = useMessageStore((s) => s.msgMap[groupId]);

  const msg = messages[0];
  const isMe = msg.senderId === userId;

  const renderContent = () => {
    if (msg.type === MESSAGE_TYPE.Image) {
      return <ImageGroup messages={messages} />;
    }

    if (messages.length !== 1) {
      return <TextMessage content="消息错误" />;
    }

    const singleMsg = messages[0];

    if (singleMsg.type === MESSAGE_TYPE.File) {
      return <FileMessage msg={singleMsg} isMe={isMe} isRead={isRead} />;
    }

    if (singleMsg.type === MESSAGE_TYPE.Video) {
      return <VideoMessage msg={singleMsg} isMe={isMe} isRead={isRead} />;
    }

    if (singleMsg.type === MESSAGE_TYPE.Audio) {
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

    return <TextMessage content={singleMsg.content || '未知消息'} />;
  };

  return (
    <div className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl py-2 text-sm',
          isMe ? 'rounded-br-sm pl-3 pr-2' : 'bg-muted rounded-bl-sm pl-2 pr-3',
          msg.type === MESSAGE_TYPE.Image ? 'relative group' : 'shadow-sm',
        )}
      >
        {renderContent()}
        {msg.type !== MESSAGE_TYPE.Audio && (
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
  );
};

export default memo(MessageItem);
