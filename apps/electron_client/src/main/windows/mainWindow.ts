import {
  ELECTRON_RENDERER_PORT,
  ELECTRON_TO_CLIENT_CHANNELS,
  WINDOW_ID,
  db,
} from '@c_chat/shared-config';
import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { env } from '../../utils/env';
import { storeTableClass } from '@c_chat/electron_client/db';
import { ApiClient } from '@c_chat/electron_client/utils/axios/service/apiService';
import initOsData from '@c_chat/electron_client/utils/osData';
import { WebContentEvents } from '@c_chat/shared-types';

/**
 * 旧版单窗口管理器（兼容用途）
 * 建议迁移到新的 WindowManager 类
 */
export class MainWindowManager {
  private static instance: MainWindowManager;
  private mainWindow: BrowserWindow | null = null;
  private isAuthenticated = false;
  private authWinOptions = {
    width: 400,
    height: 600,
  };
  private defaultWinOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  };

  private constructor() {}

  public static getInstance(): MainWindowManager {
    if (!MainWindowManager.instance) {
      MainWindowManager.instance = new MainWindowManager();
    }
    return MainWindowManager.instance;
  }

  createWindow(windowId = db.DEFAULT_WINDOW_ID): BrowserWindow {
    // 🔒 防止重复创建
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
      return this.mainWindow;
    }
    initOsData();

    this.initAccessToken(windowId);

    const otherOptions = this.isAuthenticated ? this.defaultWinOptions : this.authWinOptions;

    const additionalArguments = [`${WINDOW_ID}=${windowId}`];

    // 创建窗口
    this.mainWindow = new BrowserWindow({
      ...otherOptions,
      resizable: this.isAuthenticated,
      maximizable: this.isAuthenticated,
      fullscreenable: this.isAuthenticated,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon: join(process.resourcesPath, 'icon.png') } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        additionalArguments,
      },
    });

    // 防闪烁显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow!.show();
      console.log('Main window ready-to-show', this.mainWindow?.id);

      // accessToken && this.autoSignIn(accessToken);

      console.log('this.mainWindow?.webContents.id', this.mainWindow?.webContents.id);
      // 开发环境自动打开 DevTools
      if (env.isDev) {
        this.mainWindow!.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // 外部链接处理
    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // 加载内容
    const loadUrl = `http://localhost:${ELECTRON_RENDERER_PORT}/#/auth/sign-in`;

    this.mainWindow.loadURL(loadUrl).catch((err) => {
      console.log(`加载失败: ${err.message}`);
      // 开发环境重试
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => this.mainWindow?.loadURL(loadUrl), 1000);
      }
    });

    // 窗口关闭清理
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /** 初始化token相关的 */
  initAccessToken(windowId: number) {
    const accessToken = storeTableClass.getAccessToken(windowId);
    if (accessToken) {
      ApiClient.instance.setAuthHeader(accessToken);
    }
  }

  public applyAuthState(loggedIn: boolean): void {
    this.isAuthenticated = loggedIn;
    if (!this.mainWindow) return;
    this.mainWindow.setResizable(loggedIn);
    this.mainWindow.setMaximizable(loggedIn);
    this.mainWindow.setFullScreenable(loggedIn);
    if (loggedIn) {
      this.mainWindow.setMinimumSize(
        this.defaultWinOptions.minWidth,
        this.defaultWinOptions.minHeight,
      );
      this.mainWindow.setSize(this.defaultWinOptions.width, this.defaultWinOptions.height);
    } else {
      this.mainWindow.setSize(this.authWinOptions.width, this.authWinOptions.height);
    }
    this.mainWindow.center();
  }

  static sendWebContentEvent(
    channel: keyof WebContentEvents,
    ...args: Parameters<WebContentEvents[keyof WebContentEvents]>
  ) {
    const mainWindow = MainWindowManager.getInstance().mainWindow;
    if (mainWindow) {
      mainWindow.webContents.send(channel, ...args);
    }
  }
  static showToast(...args: Parameters<WebContentEvents['toast']>) {
    MainWindowManager.sendWebContentEvent(ELECTRON_TO_CLIENT_CHANNELS.Toast, ...args);
  }
}
