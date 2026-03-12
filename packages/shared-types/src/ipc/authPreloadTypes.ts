import { IpcCallMethod } from './ipcTypes';

export interface AuthPreloadTypes {
  [IpcCallMethod.SignIn]: (data: { windowId: number }) => Promise<void>;
}
