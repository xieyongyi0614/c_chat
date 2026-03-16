import { IPC_CONFIG } from '@c_chat/shared-config';
import { IpcCallMethod, type IpcTypes } from '@c_chat/shared-types';
import { BaseIpcCall } from '../baseIpcCall';

export class AuthIpcCall extends BaseIpcCall {
  async login(data: Parameters<IpcTypes[IpcCallMethod.SignIn]>[0]) {
    const res = await this.sendIpcMessage({ method: IpcCallMethod.SignIn, params: data });
    return res;
  }
}
