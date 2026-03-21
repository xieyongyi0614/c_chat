import os from 'os';
import { machineIdSync } from 'node-machine-id';
import crypto from 'crypto';
import { storeTableClass } from '../db';
import { db } from '@c_chat/shared-config';

export type OsData = {
  machineId: string;
  hostname: string;
  arch: string;
  platform: string;
  release: string;
};

const initOsData = () => {
  let data = storeTableClass.getOsData();

  if (data) return data;

  // 获取原始机器ID
  const originalMachineId = machineIdSync();

  // 将机器ID转换为MD5格式
  const machineId = crypto.createHash('md5').update(originalMachineId).digest('hex');

  data = {
    hostname: os.hostname(),
    arch: os.arch(),
    platform: os.platform(),
    release: os.release(),
    machineId: machineId,
  };

  storeTableClass.setDsData(data);
  return data;
};

export default initOsData;

// export const getLocalIPv4 = () => {
//   const interfaces = os.networkInterfaces();

//   for (const interfaceName in interfaces) {
//     const networkInterface = interfaces[interfaceName];

//     for (const iface of networkInterface) {
//       // 筛选IPv4地址且非内部地址
//       if (iface.family === 'IPv4' && !iface.internal) {
//         return iface.address;
//       }
//     }
//   }

//   return ''; // 如果没有找到，返回空字符串
// };
