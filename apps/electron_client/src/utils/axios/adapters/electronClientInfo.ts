import { app } from 'electron';
import type { ClientInfo } from '@c_chat/shared-api';

export const electronClientInfo: ClientInfo = {
  get name() {
    return app.getName();
  },
  get version() {
    return app.getVersion();
  },
  platform: process.platform,
};
