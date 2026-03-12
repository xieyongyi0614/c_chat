import { IPC_CONFIG } from '@c_chat/shared-config';
import { IpcCallMethod, type IpcTypes } from '@c_chat/shared-types';

export class AuthIpcCall {
  static async login(data: any) {
    const api = window[IPC_CONFIG.API_NAME];
    const res = await api.ipcCall({ method: IpcCallMethod.SignIn, params: data });
    console.log('res', res);
  }
}
