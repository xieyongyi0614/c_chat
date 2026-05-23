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
  focusWindowById: (id) => {
    if (!id) {
      console.log('windowId is null');
      return;
    }
    ipcRenderer.send('window:focus', id);
  },
  minimizeCurrentWindow: () => {
    ipcRenderer.send('window:minimize-current');
  },
  toggleCurrentWindowMaximize: () => {
    ipcRenderer.send('window:toggle-maximize-current');
  },
  toggleCurrentWindowAlwaysOnTop: () => {
    const result = ipcRenderer.sendSync('window:toggle-always-on-top-current') as unknown;
    return result === true;
  },
};
