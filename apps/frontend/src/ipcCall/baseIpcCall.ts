import { IPC_CONFIG } from '@c_chat/shared-config';
import type { IpcMessage, IpcResponse, IpcTypes } from '@c_chat/shared-types';

export class BaseIpcCall {
  async sendIpcMessage<T extends keyof IpcTypes>(
    message: IpcMessage<T>,
  ): Promise<IpcResponse<ReturnType<IpcTypes[T]>>> {
    return await window[IPC_CONFIG.API_NAME].ipcCall(message);
  }
}
