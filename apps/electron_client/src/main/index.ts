import { app, BrowserWindow, ipcMain } from 'electron';
import { electronApp } from '@electron-toolkit/utils';

import { ApiClient } from '../utils/axios/service/apiService';
import { MainWindowManager } from './windows/mainWindow';
import { SocketService } from '../utils/socket-io-client';

const apiClient = new ApiClient();
let mainWindowManager: MainWindowManager;

const testLogin = async (mainWindow: BrowserWindow | null) => {
  const res = await apiClient.auth.login({ email: '1796709584@qq.com', password: '123456' });
  const socketService = SocketService.getInstance();
  if (mainWindow) {
    socketService.init(mainWindow, res.access_token);
  }
};

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.c_chat.desktop');
  mainWindowManager = MainWindowManager.getInstance();

  ipcMain.on('ping', () => console.log('pong'));
  ipcMain.on('auth:logged-in', () => {
    mainWindowManager.applyAuthState(true);
  });
  ipcMain.on('auth:logged-out', () => {
    mainWindowManager.applyAuthState(false);
  });
  ipcMain.on('window:close', () => {
    mainWindowManager.getWindow()?.close();
  });
  ipcMain.on('window:open-settings', () => {
    // TODO: 打开设置页（暂未实现），可以在现有窗口内导航或创建新窗口
    // 这里先输出日志占位
    console.log('Open settings requested');
  });

  mainWindowManager.createWindow();
  // 可根据需要启动测试登录
  // testLogin(mainWindowManager.getWindow());

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) mainWindowManager.createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
