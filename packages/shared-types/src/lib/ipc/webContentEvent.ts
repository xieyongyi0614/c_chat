import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { ErrorResult } from '@c_chat/shared-protobuf';
import { AuthTypes } from './apiTypes';
import { SocketTypes } from '../socket.types';
import { LocalMessageListItem } from '../db';
type Unsubscribe = () => void;
export interface WebContentEventType {
  on: <T extends keyof WebContentEvents>(channel: T, callback: WebContentEvents[T]) => Unsubscribe;
  emit: <T>(channel: string, data: T) => void;
  off: (channel: string, callback: (data: any) => void) => void;
}

const { SocketConnSuccess, SocketDisconnected, ERROR, SocketReconnecting, Toast, newMessage } =
  ELECTRON_TO_CLIENT_CHANNELS;

export interface WebContentEvents {
  [SocketConnSuccess]: (data: AuthTypes.GetUserInfoResponse) => void;
  [SocketDisconnected]: (data: any) => void;
  [ERROR]: (error: Partial<Pick<ErrorResult, 'errorCode' | 'errorMessage'>>) => void;
  [SocketReconnecting]: (error: SocketTypes.WebContentEvents.SocketReconnectingType) => void;
  [newMessage]: (data: LocalMessageListItem) => void;

  [Toast]: (type: 'success' | 'error' | 'info' | 'warning' | 'loading', message: string) => void;
}
