import { app, Menu, MenuItemConstructorOptions, nativeImage, Tray } from 'electron';
import { WindowManager } from '../windows';
import { db } from '@c_chat/shared-config';
import { resolveResource } from '@c_chat/electron_client/utils/resolveResource';
import { storeTableClass } from '@c_chat/electron_client/db';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private static instance: TrayManager;

  private constructor() {
    this.windowManager = WindowManager.getInstance();
    this.initTray();

    try {
      this.windowManager.onWindowChange(() => {
        this.updateTrayMenu();
      });
    } catch (err) {
      console.log('updateTrayMenu error:', err);
    }
  }

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager();
    }
    return TrayManager.instance;
  }

  private initTray() {
    // 创建托盘图标
    const iconPath = resolveResource('logo.png');
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      console.warn('Tray icon not found, using default icon');
    }

    this.tray = new Tray(icon.isEmpty() ? '' : iconPath);

    this.updateTrayMenu();

    this.tray.on('click', () => {
      const mainWindow = this.windowManager.getDefaultWindow();
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      } else {
        this.windowManager.createWindow(db.DEFAULT_WINDOW_ID);
      }
    });

    app.on('before-quit', () => {
      this.tray?.destroy();
    });
  }
  private generateWindowListItem(windowId: number) {
    if (!windowId) {
      return {
        label: '未知窗口',
        enabled: false,
      };
    }
    const userInfo = WindowManager.getUserInfo(windowId);
    const window = this.windowManager.getWindow(windowId);
    const statusIcon = resolveResource(userInfo && window ? 'tray/green.png' : 'tray/red.png');
    const accountText = userInfo ? ` ${userInfo.nickname || userInfo.email}` : '';

    return {
      label: `窗口 ${windowId}${accountText}`,
      icon: nativeImage.createFromPath(statusIcon),
      click: () => {
        const res = this.windowManager.focusWindow(windowId);
        if (!res) {
          this.windowManager.createWindow(windowId);
        }
      },
    };
  }

  private updateTrayMenu() {
    if (!this.tray) return;

    const stores = storeTableClass.getAllStore(db.store.ACCESS_TOKEN) ?? [];
    const windowIds = Array.from(
      new Set([
        ...stores.map((store) => store.windowId),
        ...this.windowManager.getAllWindowIds(),
        db.DEFAULT_WINDOW_ID,
      ]),
    )
      .filter((windowId) => windowId > db.GLOBAL_WINDOW_ID)
      .sort((a, b) => a - b);
    const windowList = windowIds.map((windowId) => this.generateWindowListItem(windowId));
    const menuTemplate: MenuItemConstructorOptions[] = [
      { label: '新建窗口', click: () => this.windowManager.createWindow() },
      { type: 'separator' },
      { label: '窗口列表', submenu: windowList },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ];

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * 更新托盘菜单（当窗口状态改变时调用）
   */
  updateMenu() {
    this.updateTrayMenu();
  }

  /**
   * 重新初始化托盘（用于更新图标或菜单）
   */
  reInitTray() {
    if (this.tray) {
      this.tray.destroy();
    }
    this.initTray();
  }
}
