import { ELECTRON_RENDERER_PORT } from '@c_chat/shared-config';
import { BrowserWindow, BrowserWindowConstructorOptions, shell } from 'electron';
import { join } from 'path';
import { env } from '../../utils/env';

export class MainWindowManager {
  private static instance: MainWindowManager;
  private mainWindow: BrowserWindow | null = null;
  private isAuthenticated = false;
  private authWinOptions: BrowserWindowConstructorOptions = {
    width: 400,
    height: 600,
  };
  private defaultWinOptions: BrowserWindowConstructorOptions = {
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

  public createWindow(): BrowserWindow {
    // 🔒 防止重复创建
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
      return this.mainWindow;
    }
    const otherOptions = this.isAuthenticated ? this.defaultWinOptions : this.authWinOptions;

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
      },
    });

    // 防闪烁显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow!.show();
      console.log('Main window ready-to-show');

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
    const loadUrl = `http://localhost:${ELECTRON_RENDERER_PORT}`;

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

  public getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public applyAuthState(loggedIn: boolean): void {
    this.isAuthenticated = loggedIn;
    if (!this.mainWindow) return;

    if (loggedIn) {
      this.mainWindow.setResizable(true);
      this.mainWindow.setMaximizable(true);
      this.mainWindow.setFullScreenable(true);
      this.mainWindow.setMinimumSize(800, 600);
      this.mainWindow.setSize(1200, 800);
      this.mainWindow.center();
    } else {
      this.mainWindow.setResizable(false);
      this.mainWindow.setMaximizable(false);
      this.mainWindow.setFullScreenable(false);
      this.mainWindow.setMinimumSize(600, 600);
      this.mainWindow.setSize(600, 600);
      this.mainWindow.center();
    }
  }
}
