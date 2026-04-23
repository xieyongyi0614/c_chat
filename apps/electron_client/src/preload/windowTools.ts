import { WindowToolsEventType } from '@c_chat/shared-types';
import { ipcRenderer } from 'electron';

/**
 * 窗口工具
 */
export const windowTools: WindowToolsEventType = {
  closeWindowById: (id) => {
    if (!id) {
      console.log('windowId is null');
      return;
    }
    ipcRenderer.send('window:close', id);
  },
};
