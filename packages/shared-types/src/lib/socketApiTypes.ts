export interface SocketAPIType {
  on: <T extends any>(eventName: string, callback: (data: T) => void) => void;
  emit: <T extends any>(eventName: string, data: T) => void;
  off: <T extends any>(eventName: string, callback: (data: T) => void) => void;
  removeAllListeners: (eventName: string) => void;
}
