import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { AuthTypes } from './apiTypes';

export interface WebContentEventType {
  on: <T extends keyof WebContentEvents>(channel: T, callback: WebContentEvents[T]) => void;
  emit: <T extends any>(channel: string, data: T) => void;
  off: (channel: string, callback: (data: any) => void) => void;
}

const { SocketConnSuccess, Toast } = ELECTRON_TO_CLIENT_CHANNELS;

export interface WebContentEvents {
  [SocketConnSuccess]: (data: AuthTypes.GetUserInfoResponse) => void;
  [Toast]: (type: 'success' | 'error' | 'info' | 'warning' | 'loading', message: string) => void;
}
