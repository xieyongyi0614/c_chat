import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { AuthTypes } from './apiTypes';
import { SocketTypes } from '../socket.types';
type Unsubscribe = () => void;
export interface WebContentEventType {
  on: <T extends keyof WebContentEvents>(channel: T, callback: WebContentEvents[T]) => Unsubscribe;
  emit: <T>(channel: string, data: T) => void;
  off: (channel: string, callback: (data: any) => void) => void;
}

const { SocketConnSuccess, SocketDisconnected, SocketError, SocketReconnecting, Toast } =
  ELECTRON_TO_CLIENT_CHANNELS;

export interface WebContentEvents {
  [SocketConnSuccess]: (data: AuthTypes.GetUserInfoResponse) => void;
  [SocketDisconnected]: (data: any) => void;
  [SocketError]: (error: SocketTypes.WebContentEvents.SocketErrorType) => void;
  [SocketReconnecting]: (error: SocketTypes.WebContentEvents.SocketReconnectingType) => void;

  [Toast]: (type: 'success' | 'error' | 'info' | 'warning' | 'loading', message: string) => void;
}
