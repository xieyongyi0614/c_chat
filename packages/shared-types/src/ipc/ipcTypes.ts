import { IPC_CONFIG } from '@c_chat/shared-config';
import { AuthPreloadTypes } from './authPreloadTypes';
declare global {
  interface Window {
    api?: {
      notifyLoggedIn?: () => void;
      notifyLoggedOut?: () => void;
    };
    [IPC_CONFIG.API_NAME]: {
      ipcCall: (message: IpcMessage) => Promise<IpcResponse>;
    };
  }
}

export type IpcMethodParams<T> = T extends (...args: infer U) => any ? U : never;

export enum IpcCallMethod {
  SignIn = 'SignIn',
}

export interface IpcMessage<T extends keyof any = keyof any> {
  method: IpcCallMethod;
  params: IpcMethodParams<T>;
  id: string;
  windowId?: number;
  webContentId?: number;
}
export interface IpcResponse<T = any> {
  id: string;
  data?: T;
  error?: string;
}

export type IpcTypes = AuthPreloadTypes;
