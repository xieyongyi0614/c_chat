import { AuthIpcCall } from './widgets/authIpcCall';

export * from './widgets/authIpcCall';

export class IpcCall {
  private static instance: IpcCall;
  auth: AuthIpcCall;
  constructor() {
    this.auth = new AuthIpcCall();
  }
  public static getInstance(): IpcCall {
    if (!IpcCall.instance) {
      IpcCall.instance = new IpcCall();
    }
    return IpcCall.instance;
  }
}
