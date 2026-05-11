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
  console.log('render message item');

  const renderContent = () => {
    if (msg.type === MESSAGE_TYPE.Image) {
      return <ImageGroup messages={messages} />;
    }

    // 单个消息的其他类型
    if (messages.length !== 1) {
      return <TextMessage content="消息错误" />;
    }

    const singleMsg = messages[0];

    // 文本消息
    if (singleMsg.type === MESSAGE_TYPE.Text) {
      return <TextMessage content={singleMsg.content} />;
    }

    // 文件消息
    if (singleMsg.type === MESSAGE_TYPE.File) {
      return <FileMessage msg={singleMsg} isMe={isMe} isRead={isRead} />;
    }

    // 视频消息
    if (singleMsg.type === MESSAGE_TYPE.Video) {
      return <VideoMessage msg={singleMsg} isMe={isMe} isRead={isRead} />;
    }

    // 音频消息
    if (singleMsg.type === MESSAGE_TYPE.Audio) {
      return <AudioMessage msg={singleMsg} isMe={isMe} isRead={isRead} />;
    }

    // 默认显示为文本
    return <TextMessage content={singleMsg.content || '未知消息'} />;
  };

  // 对于非文本、非图片的内容，不需要背景气泡
  const isContentTypeWithoutBubble = () => {
    const type = messages[0].type;
    if (type === MESSAGE_TYPE.Text) {
      return false;
    }
    return [MESSAGE_TYPE.Image, MESSAGE_TYPE.File, MESSAGE_TYPE.Video, MESSAGE_TYPE.Audio].includes(
      type,
    );
  };

  const withoutBubble = isContentTypeWithoutBubble();

  return (
    <div className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}>
      {withoutBubble ? (
        <div className="max-w-[70%] relative group">
          {renderContent()}
          <MessageDate
            className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            msg={msg}
            isRead={isRead}
          />
        </div>
      ) : (
        <div
          className={cn(
            'max-w-[70%] rounded-2xl px-3 py-2 shadow-sm',
            isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm',
          )}
        >
          <div className={'text-sm'}>{renderContent()}</div>
          <MessageDate msg={msg} isRead={isRead} />
        </div>
      )}
    </div>
  );
};

export default memo(MessageItem);
