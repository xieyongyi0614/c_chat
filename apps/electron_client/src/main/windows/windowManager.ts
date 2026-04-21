import {
  ELECTRON_RENDERER_PORT,
  ELECTRON_TO_CLIENT_CHANNELS,
  WINDOW_ID,
  db,
} from '@c_chat/shared-config';
import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { env } from '../../utils/env';
import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios/service/apiService';
import initOsData from '../../utils/osData';
import { WebContentEvents } from '@c_chat/shared-types';
import { socketManager } from '../../utils/socket-io-client';

/**
 * 窗口管理器，用于管理多个窗口
 * 每个窗口通过唯一的 windowId 标识
 */
export class WindowManager {
  private static instance: WindowManager;

  // 窗口集合，存储所有窗口（windowId -> BrowserWindow）
  private windows: Map<number, BrowserWindow> = new Map();
  // Electron 窗口 ID 到 windowId 的反向映射（用于通过 BrowserWindow 获取 windowId）
  private electronIdToWindowId: Map<number, number> = new Map();
  // 默认窗口配置
  private defaultWinOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  };
  // 认证窗口配置
  private authWinOptions = {
    width: 400,
    height: 600,
  };
  // 最大窗口数量
  private readonly MAX_WINDOWS = 10;

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * 创建新窗口
   * @param windowId 窗口ID，如果不传则自动分配
   * @returns 创建的窗口实例
   */
  createWindow(windowId?: number): BrowserWindow {
    // 检查窗口数量限制
    if (this.windows.size >= this.MAX_WINDOWS) {
      throw new Error(`最多只能创建 ${this.MAX_WINDOWS} 个窗口`);
    }

    // 如果未指定 windowId，则自动分配
    const targetWindowId = windowId || this.generateWindowId();

    // 检查窗口是否已存在
    if (this.windows.has(targetWindowId)) {
      const existingWindow = this.windows.get(targetWindowId);
      if (existingWindow) {
        if (existingWindow.isMinimized()) existingWindow.restore();
        existingWindow.focus();
        return existingWindow;
      }
    }

    // 初始化窗口相关的数据
    this.initWindowData(targetWindowId);

    // 检查是否已登录，决定窗口类型
    // const isAuthenticated = !!storeTableClass.getAccessToken(targetWindowId);
    // const otherOptions = isAuthenticated ?  : this.authWinOptions;

    const additionalArguments = [`${WINDOW_ID}=${targetWindowId}`];

    // 创建窗口
    const window = new BrowserWindow({
      ...this.authWinOptions,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
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

    // 建立 Electron 窗口 ID 到 windowId 的映射关系
    this.electronIdToWindowId.set(window.id, targetWindowId);

    // 窗口生命周期事件
    window.once('ready-to-show', () => {
      window.show();
      console.log(`Window ready-to-show: id=${window.id}, windowId=${targetWindowId}`);

      if (env.isDev) {
        window.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // 外部链接处理
    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // 加载内容
    const loadUrl = `http://localhost:${ELECTRON_RENDERER_PORT}/#/auth/sign-in`;
    window.loadURL(loadUrl).catch((err) => {
      console.log(`Window load failed: ${err.message}`);
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => window.loadURL(loadUrl), 1000);
      }
    });

    // 窗口关闭清理
    window.on('closed', () => {
      // 销毁对应的 socket 连接
      socketManager.destroySocket(targetWindowId);

      this.windows.delete(targetWindowId);
      this.electronIdToWindowId.delete(window.id);
      console.log(`Window closed: id=${targetWindowId}`);
      // 通知外部组件更新菜单
      this.notifyWindowChange();
    });

    // 保存窗口引用
    this.windows.set(targetWindowId, window);
    console.log(`Window created: id=${targetWindowId}, count=${this.windows.size}`);

    // 通知外部组件更新菜单
    this.notifyWindowChange();

    return window;
  }

  /**
   * 关闭指定窗口
   * @param windowId 窗口ID
   * @returns 是否成功关闭
   */
  closeWindow(windowId: number): boolean {
    const window = this.windows.get(windowId);
    if (!window) {
      console.warn(`Window not found: id=${windowId}`);
      return false;
    }

    // 销毁对应的 socket 连接
    socketManager.destroySocket(windowId);

    window.close();
    return true;
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows() {
    // 销毁所有 socket 连接
    socketManager.destroyAll();
    // 关闭所有窗口
    this.windows.forEach((window) => window.close());
  }

  /**
   * 获取指定窗口
   * @param windowId 窗口ID
   * @returns 窗口实例，不存在则返回 null
   */
  getWindow(windowId: number): BrowserWindow | null {
    return this.windows.get(windowId) || null;
  }

  /**
   * 获取所有窗口
   * @returns 窗口数组
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * 获取窗口数量
   */
  getWindowCount(): number {
    return this.windows.size;
  }

  /**
   * 通过 BrowserWindow 实例获取 windowId
   * @param window BrowserWindow 实例
   * @returns windowId，不存在则返回 null
   */
  getWindowIdByBrowserWindow(window: BrowserWindow): number | null {
    return this.electronIdToWindowId.get(window.id) ?? null;
  }

  /**
   * 通过 Electron 窗口 ID 获取 windowId
   * @param electronId Electron 窗口 ID
   * @returns windowId，不存在则返回 null
   */
  getWindowIdByElectronId(electronId: number): number | null {
    return this.electronIdToWindowId.get(electronId) ?? null;
  }

  /**
   * 获取默认窗口（windowId = 1）
   */
  getDefaultWindow(): BrowserWindow | null {
    return this.getWindow(db.DEFAULT_WINDOW_ID);
  }

  /**
   * 获取已登录的窗口列表
   */
  getAuthenticatedWindows(): BrowserWindow[] {
    return this.getAllWindows().filter((win) => {
      const windowId = (win as any).id;
      return !!storeTableClass.getAccessToken(windowId);
    });
  }

  /**
   * 切换到指定窗口
   * @param windowId 窗口ID
   */
  focusWindow(windowId: number): boolean {
    const window = this.windows.get(windowId);
    if (!window) {
      console.warn(`Window not found: id=${windowId}`);
      return false;
    }

    if (window.isMinimized()) window.restore();
    window.focus();
    return true;
  }

  /**
   * 初始化窗口数据
   * @param windowId 窗口ID
   */
  private initWindowData(windowId: number): void {
    // 初始化访问令牌
    const accessToken = storeTableClass.getAccessToken(windowId);
    if (accessToken) {
      ApiClient.instance.setAuthHeader(accessToken);
    }

    // 初始化系统数据
    initOsData();
  }

  /**
   * 生成唯一的窗口ID
   * 优先使用 db.DEFAULT_WINDOW_ID(1)，然后递增
   */
  private generateWindowId(): number {
    // 如果默认窗口不存在，使用默认窗口ID
    if (!this.windows.has(db.DEFAULT_WINDOW_ID)) {
      return db.DEFAULT_WINDOW_ID;
    }

    // 从 2 开始查找可用的窗口ID
    let windowId = 2;
    while (this.windows.has(windowId) && windowId < this.MAX_WINDOWS) {
      windowId++;
    }

    if (windowId >= this.MAX_WINDOWS) {
      throw new Error('窗口数量已达上限');
    }

    return windowId;
  }

  /**
   * 将窗口关联到指定的 windowId
   * 在 createWindow 中已经处理
   */
  assignWindowToWindowId(window: BrowserWindow, windowId: number): void {
    window.id = windowId;
    this.windows.set(windowId, window);
  }

  /**
   * 检查指定 windowId 的窗口是否已登录
   * @param windowId 窗口ID
   */
  isWindowAuthenticated(windowId: number): boolean {
    return !!storeTableClass.getAccessToken(windowId);
  }

  /**
   * 通知所有窗口某个事件
   * @param channel 事件频道
   * @param args 事件参数
   */
  static sendToAllWindows(
    channel: keyof WebContentEvents,
    ...args: Parameters<WebContentEvents[keyof WebContentEvents]>
  ) {
    const manager = WindowManager.getInstance();
    manager.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, ...args);
      }
    });
  }

  /**
   * 向指定窗口发送事件
   * @param windowId 窗口ID
   * @param channel 事件频道
   * @param args 事件参数
   */
  static sendToWindow(
    windowId: number,
    channel: keyof WebContentEvents,
    ...args: Parameters<WebContentEvents[keyof WebContentEvents]>
  ): boolean {
    const window = WindowManager.getInstance().windows.get(windowId);
    if (!window || window.isDestroyed()) {
      console.warn(`Window not found or destroyed: id=${windowId}`);
      return false;
    }
    window.webContents.send(channel, ...args);
    return true;
  }
  static showToast(windowId: number, ...args: Parameters<WebContentEvents['toast']>) {
    WindowManager.sendToWindow(windowId, ELECTRON_TO_CLIENT_CHANNELS.Toast, ...args);
    return true;
  }

  /**
   * 获取窗口的访问令牌
   * @param windowId 窗口ID
   */
  static getAccessToken(windowId: number): string | undefined {
    return storeTableClass.getAccessToken(windowId);
  }

  /**
   * 设置窗口的访问令牌
   * @param windowId 窗口ID
   * @param accessToken 访问令牌
   */
  static setAccessToken(windowId: number, accessToken: string): void {
    storeTableClass.setAccessToken(accessToken, windowId);
  }

  /**
   * 获取窗口的用户信息
   * @param windowId 窗口ID
   */
  static getUserInfo(windowId: number) {
    return storeTableClass.getUserInfo(windowId);
  }

  /**
   * 设置窗口的用户信息
   * @param windowId 窗口ID
   * @param userInfo 用户信息
   */
  static setUserInfo(windowId: number, userInfo: any): void {
    storeTableClass.setUserInfo(userInfo, windowId);
  }

  /**
   * 获取窗口的刷新令牌
   * @param windowId 窗口ID
   */
  static getRefreshToken(windowId: number): string | undefined {
    return storeTableClass.getRefreshToken(windowId);
  }

  /**
   * 设置窗口的刷新令牌
   * @param windowId 窗口ID
   * @param refreshToken 刷新令牌
   */
  static setRefreshToken(windowId: number, refreshToken: string): void {
    storeTableClass.setRefreshToken(refreshToken, windowId);
  }

  /**
   * 应用窗口的认证状态（调整窗口大小等）
   * @param windowId 窗口ID
   * @param loggedIn 是否已登录
   */
  applyWindowAuthState(windowId: number, loggedIn: boolean): void {
    const window = this.windows.get(windowId);
    if (!window) return;

    if (loggedIn) {
      window.setResizable(true);
      window.setMaximizable(true);
      window.setFullScreenable(true);
      window.setMinimumSize(this.defaultWinOptions.minWidth, this.defaultWinOptions.minHeight);
      window.setSize(this.defaultWinOptions.width, this.defaultWinOptions.height);
    } else {
      window.setSize(this.authWinOptions.width, this.authWinOptions.height);
    }
    window.center();
  }

  /**
   * 通知外部组件窗口状态发生变化
   */
  private notifyWindowChange(): void {
    // 这里可以通过广播事件等方式通知外部组件
    // 目前暂时留空，后续可以实现具体的通知机制
  }
}
