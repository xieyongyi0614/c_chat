import { ELECTRON_RENDERER_PORT } from '@c_chat/shared-config';
import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { env } from '../../utils/env';

export class MainWindowManager {
  private static instance: MainWindowManager;
  private mainWindow: BrowserWindow | null = null;

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

    // 创建窗口
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false, // 先隐藏防闪烁
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon: join(process.resourcesPath, 'icon.png') } : {}),
      webPreferences: {
        preload: join(__dirname, '../../preload/index.cjs'), // 确保是 .cjs
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
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
}
