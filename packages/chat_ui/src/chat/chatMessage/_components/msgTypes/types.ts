import type { CSSProperties, RefObject } from 'react';
import type { MessageType } from '@c_chat/shared-config';
import type { MessageStatus } from '@c_chat/shared-types';

export interface ChatMessageFileResolver {
  formatFileUrl: (value: string) => string;
  loadLocalPreview?: (message: ChatMessageMediaItem) => Promise<string>;
}

export interface ChatMessageStatusProps {
  status: MessageStatus;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

export interface ChatMessageDateProps extends ChatMessageStatusProps {
  time: number;
  isMe: boolean;
  className?: string;
}

export interface ChatMessageMediaItem {
  id: string;
  clientMsgId: string;
  conversationId?: string;
  type: MessageType;
  content?: string;
  fileUrl?: string;
  filePath?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  waveform?: string;
  status: MessageStatus;
  progress?: number;
  createTime: number;
}

export interface ChatMessageRetryProps {
  isMe: boolean;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

export interface TextMessageProps {
  content: string;
}

export interface ImageGroupProps extends ChatMessageRetryProps {
  messages: ChatMessageMediaItem[];
  fileResolver: ChatMessageFileResolver;
  onOpenPreview?: (initialIndex: number) => void;
}

export interface ImagePreviewProps {
  message: ChatMessageMediaItem;
  index: number;
  imgClassName: string;
  fileResolver: ChatMessageFileResolver;
  containerStyle?: CSSProperties;
  onOpen?: (index: number) => void;
}

export interface FileMessageProps extends ChatMessageRetryProps {
  message: ChatMessageMediaItem;
  fileResolver: ChatMessageFileResolver;
}

export interface VideoMessageProps extends ChatMessageRetryProps {
  message: ChatMessageMediaItem;
  fileResolver: ChatMessageFileResolver;
  onOpenPreview?: () => void;
}

export interface AudioPlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
}

export interface AudioMessageProps extends ChatMessageRetryProps {
  message: ChatMessageMediaItem;
  audioUrl: string;
  voice: {
    waveform: string;
    duration: number;
  };
  playback: AudioPlaybackState;
  waveformCanvasRef: RefObject<HTMLCanvasElement | null>;
  fileResolver: ChatMessageFileResolver;
  senderName?: string;
  forwarded?: boolean;
  onTogglePlay: () => void | Promise<void>;
}
