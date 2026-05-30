/**
 * Socket 发送指令时需要的身份信息。
 * - `userId`：当前登录账号 id，用于 protobuf `Command.userId`
 * - `client`：设备/客户端标识（Electron 用 machineId），用于 protobuf `Command.client`
 * Web / RN 端各自实现自己的身份来源。
 */
export interface IdentityProvider {
  getIdentity(): { userId?: string; client: string };
}
