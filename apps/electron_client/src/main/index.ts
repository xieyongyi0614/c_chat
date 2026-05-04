import { app, BrowserWindow, ipcMain } from 'electron';
import { electronApp } from '@electron-toolkit/utils';

import { ApiClient } from '../utils/axios/service/apiService';
import { WindowManager } from './windows';
import { dbManager } from '../db/DatabaseManager';
import { db } from '@c_chat/shared-config';
import '../ipc';
import { initActions } from '../ipc/util';
import { TrayManager } from './tray/trayManager';
import { socketManager } from '../utils/socket-io-client';
import { uploadScheduler } from '../utils/UploadScheduler';

ApiClient.init();
dbManager.initGlobalDb();

app.setName('c_chat');
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.c_chat.desktop');
  const windowManager = WindowManager.getInstance();
  const trayManager = TrayManager.getInstance();

  initActions();
  uploadScheduler.init();

  // 创建默认窗口
  windowManager.createWindow(db.DEFAULT_WINDOW_ID);

  // 托盘菜单添加多账号窗口创建功能
  ipcMain.on('window:create-new', () => {
    windowManager.createWindow();
    // 更新托盘菜单
    trayManager.updateMenu();
  });

  ipcMain.on('window:focus', (_, windowId) => {
    windowManager.focusWindow(windowId);
  });

  ipcMain.on('window:close', (_, windowId) => {
    windowManager.closeWindow(windowId);
    // 更新托盘菜单
    trayManager.updateMenu();
  });

  // 监听窗口关闭事件，更新托盘菜单
  windowManager.getAllWindows().forEach((window) => {
    window.on('closed', () => {
      trayManager.updateMenu();
    });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow(db.DEFAULT_WINDOW_ID);
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 清理所有 socket 连接
  socketManager.destroyAll();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  // 清理所有 socket 连接
  socketManager.destroyAll();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
