import { AuthPreloadTypes } from './authPreloadTypes';
export * from './authPreloadTypes';

export type IpcCallParams<T> = T extends (...args: infer U) => any ? U : never;

export enum IpcCallMethod {
  SignIn = 'SignIn',
  SignUp = 'SignUp',
}
export type IpcMethod<P, R> = (params: P) => Promise<R>;

export interface IpcMessage<T extends keyof any = keyof any> {
  method: IpcCallMethod;
  params: IpcCallParams<T>;
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

export type IpcBridgeApi = {
  ipcCall: (message: IpcMessage) => Promise<IpcResponse>;
  id?: number;
  windowId?: number;
  webContentId?: number;
};
