import { AuthPreloadTypes, ChatPreloadTypes, FileOperationPreloadTypes } from './ipcCallTypes';

export * from './ipcCallTypes';

export type IpcMethod<P = any, R = any> = (params: P) => Promise<R>;

export interface IpcMessage<T extends keyof IpcTypes = keyof IpcTypes> {
  method: T;
  params: Parameters<IpcTypes[T]>;
  id: string;
  windowId?: number;
  webContentId?: number;
}
export interface IpcResponse<T = any> {
  id: string;
  data?: T;
  error?: string;
}

export type IpcTypes = AuthPreloadTypes & ChatPreloadTypes & FileOperationPreloadTypes;

export type IpcBridgeApi = {
  ipcCall: (message: IpcMessage) => Promise<IpcResponse>;
  id?: number;
  windowId?: number;
  webContentId?: number;
};
