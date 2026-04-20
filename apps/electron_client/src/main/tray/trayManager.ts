import { app, Menu, MenuItemConstructorOptions, nativeImage, Tray } from 'electron';
import { WindowManager } from '../windows';
import { db } from '@c_chat/shared-config';
import path from 'path';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private static instance: TrayManager;

  private constructor() {
    this.windowManager = WindowManager.getInstance();
    this.initTray();
  }

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager();
    }
    return TrayManager.instance;
  }

  private initTray() {
    // 创建托盘图标
    // const iconPath = path.join(process.resourcesPath, 'icon.png');
    const iconPath = path.join(__dirname, '..', '..', 'src', 'main', 'tray', 'tray-icon.png');
    console.log('iconPath:', iconPath);
    const icon = nativeImage.createFromPath(iconPath);

    // 如果无法加载图标，使用默认图标
    if (icon.isEmpty()) {
      console.warn('Tray icon not found, using default icon');
    }

    this.tray = new Tray(icon.isEmpty() ? '' : iconPath);

    // 设置托盘菜单
    this.updateTrayMenu();

    // 托盘点击事件
    this.tray.on('click', () => {
      // 点击托盘图标时激活主窗口
      const mainWindow = this.windowManager.getDefaultWindow();
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      } else {
        // 如果没有主窗口，则创建一个新的
        this.windowManager.createWindow(db.DEFAULT_WINDOW_ID);
      }
    });

    // 应用退出时清理
    app.on('before-quit', () => {
      this.tray?.destroy();
    });
  }

  private updateTrayMenu() {
    if (!this.tray) return;

    // 获取当前活动的窗口
    const windows = this.windowManager.getAllWindows();
    // const authenticatedWindows = this.windowManager.getAuthenticatedWindows();

    // 构建托盘菜单
    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: '新建窗口',
        click: () => {
          this.windowManager.createWindow();
        },
      },
      {
        type: 'separator',
      },
      {
        label: '窗口列表',
        submenu:
          windows.length > 0
            ? windows.map((window) => {
                const windowId = this.windowManager.getWindowIdByBrowserWindow(window);
                if (!windowId) return { label: '未知窗口', enabled: false };
                const isAuthenticated = this.windowManager.isWindowAuthenticated(windowId);
                const userInfo = WindowManager.getUserInfo(windowId);
                const windowLabel =
                  isAuthenticated && userInfo
                    ? `窗口 ${windowId} (${userInfo.nickname || userInfo.email})`
                    : `窗口 ${windowId} (未登录)`;

                return {
                  label: windowLabel,
                  click: () => {
                    this.windowManager.focusWindow(windowId);
                  },
                };
              })
            : [{ label: '暂无窗口', enabled: false }],
      },
      {
        type: 'separator',
      },
      {
        label: '退出',
        click: () => {
          app.quit();
        },
      },
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
  reinitTray() {
    if (this.tray) {
      this.tray.destroy();
    }
    this.initTray();
  }
}
