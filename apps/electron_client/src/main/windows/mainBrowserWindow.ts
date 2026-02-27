import { ELECTRON_RENDERER_PORT } from '@c_chat/shared-config';
import { BrowserWindow, shell } from 'electron';
import { join } from 'path';

export class MainBrowserWindow {
  public mainWindow: BrowserWindow | null = null;

  createWindow() {
    if (this.mainWindow) {
      console.log('Main window already exists');
      return;
    }
    // Create the browser window.
    const newMainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux'
        ? { icon: join(__dirname, '../../../resources/icon.png') }
        : {}),
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        sandbox: false,
      },
    });
    this.mainWindow = newMainWindow;

    newMainWindow.on('ready-to-show', () => {
      newMainWindow.show();
    });

    newMainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    // if (is.dev) {
    newMainWindow.loadURL(`http://localhost:${ELECTRON_RENDERER_PORT}`);
    // } else {
    //   mainWindow.loadFile(join(__dirname, '../../../../dist/frontend/index.html'))
    // }
  }
}
