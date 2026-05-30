import { storeTableClass } from '../../../db';
import initOsData from '../../osData';
import type { IdentityProvider } from '@c_chat/shared-api';

/**
 * 按 windowId 提供 socket 发送指令所需的身份：
 * - userId 取自 sqlite store 的当前账号
 * - client 取本机 machineId
 */
export const createElectronIdentityProvider = (windowId: number): IdentityProvider => ({
  getIdentity() {
    return {
      userId: storeTableClass.getUserInfo(windowId)?.id,
      client: initOsData().machineId,
    };
  },
});
