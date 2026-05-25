import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import type { ErrorResult } from '@c_chat/shared-protobuf';
import type { AuthTypes } from './apiTypes';
import type { SocketTypes } from '../socket.types';
import type { LocalConversationListItem, LocalMessageListItem } from '../db';
type Unsubscribe = () => void;
export interface WebContentEventType {
  on: <T extends keyof WebContentEvents>(channel: T, callback: WebContentEvents[T]) => Unsubscribe;
  emit: <T>(channel: string, data: T) => void;
  off: (channel: string, callback: (data: any) => void) => void;
}

const {
  SocketConnSuccess,
  SocketDisconnected,
  ERROR,
  SocketReconnecting,
  Toast,
  newUpdateMessage,
  uploadProgress,
  MediaPreviewPayloadUpdated,
} = ELECTRON_TO_CLIENT_CHANNELS;

export interface WebContentEvents {
  [SocketConnSuccess]: (data: AuthTypes.GetUserInfoResponse) => void;
  [SocketDisconnected]: (data: any) => void;
  [ERROR]: (error: Partial<Pick<ErrorResult, 'errorCode' | 'errorMessage'>>) => void;
  [SocketReconnecting]: (error: SocketTypes.WebContentEvents.SocketReconnectingType) => void;
  [newUpdateMessage]: (data: {
    messages?: LocalMessageListItem[];
    conversations?: LocalConversationListItem[];
    removedConversationIds?: string[];
  }) => void;
  [MediaPreviewPayloadUpdated]: (data: MediaPreviewPayload) => void;
  [uploadProgress]: (data: { clientMsgId: string; progress: number }) => void;

  [Toast]: (type: 'success' | 'error' | 'info' | 'warning' | 'loading', message: string) => void;
}

export type MediaPreviewType = 'image' | 'video';

export interface MediaPreviewItem {
  id: string;
  type: MediaPreviewType;
  url?: string;
  fileUrl?: string;
  filePath?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  createTime?: number;
  senderId?: string;
}

export interface MediaPreviewPayload {
  items: MediaPreviewItem[];
  initialIndex: number;
  sourceWindowId?: number;
  conversationId?: string;
  messageId?: string;
}
