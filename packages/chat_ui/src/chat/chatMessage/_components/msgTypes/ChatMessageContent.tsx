import { memo, type Ref } from 'react';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import AudioMessage from './AudioMessage';
import FileMessage from './FileMessage';
import ImageGroup from './ImageGroup';
import TextMessage from './TextMessage';
import VideoMessage from './VideoMessage';
import type {
  AudioPlaybackState,
  ChatMessageFileResolver,
  ChatMessageMediaItem,
  ChatMessageRetryProps,
} from './types';

export interface ChatMessageAudioControls {
  playback: AudioPlaybackState;
  waveformCanvasRef: Ref<HTMLCanvasElement>;
  onTogglePlay: () => void | Promise<void>;
}

export interface ChatMessageContentProps extends ChatMessageRetryProps {
  messages: ChatMessageMediaItem[];
  fileResolver: ChatMessageFileResolver;
  audioControls?: ChatMessageAudioControls;
  onOpenPreview?: (initialIndex: number) => void;
  invalidGroupText?: string;
  unknownText?: string;
}

function ChatMessageContent({
  messages,
  isMe,
  isRead,
  onRetry,
  retrying,
  fileResolver,
  audioControls,
  onOpenPreview,
  invalidGroupText = '消息错误',
  unknownText = '未知消息',
}: ChatMessageContentProps) {
  const message = messages[0];
  if (!message) {
    return <TextMessage content={unknownText} />;
  }

  if (message.type === MESSAGE_TYPE.Image) {
    return (
      <ImageGroup
        messages={messages}
        isMe={isMe}
        isRead={isRead}
        onRetry={onRetry}
        retrying={retrying}
        fileResolver={fileResolver}
        onOpenPreview={onOpenPreview}
      />
    );
  }

  if (messages.length !== 1) {
    return <TextMessage content={invalidGroupText} />;
  }

  if (message.type === MESSAGE_TYPE.File) {
    return (
      <FileMessage
        message={message}
        isMe={isMe}
        isRead={isRead}
        onRetry={onRetry}
        retrying={retrying}
        fileResolver={fileResolver}
      />
    );
  }

  if (message.type === MESSAGE_TYPE.Video) {
    return (
      <VideoMessage
        message={message}
        isMe={isMe}
        isRead={isRead}
        onRetry={onRetry}
        retrying={retrying}
        fileResolver={fileResolver}
        onOpenPreview={() => onOpenPreview?.(0)}
      />
    );
  }

  if (message.type === MESSAGE_TYPE.Audio && audioControls) {
    return (
      <AudioMessage
        audioUrl={message.fileUrl ?? ''}
        isMe={isMe}
        isRead={isRead}
        voice={{
          waveform: message.waveform ?? '',
          duration: message.duration ?? 0,
        }}
        message={message}
        onRetry={onRetry}
        retrying={retrying}
        playback={audioControls.playback}
        waveformCanvasRef={audioControls.waveformCanvasRef}
        fileResolver={fileResolver}
        onTogglePlay={audioControls.onTogglePlay}
      />
    );
  }

  return <TextMessage content={message.content || unknownText} />;
}

export default memo(ChatMessageContent);
