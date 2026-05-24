import {
  CALL_WINDOW_KEY,
  CALL_WINDOW_RENDERER_PORT,
  CALL_WINDOW_VALUE,
  ELECTRON_TO_CLIENT_CHANNELS,
  db,
} from '@c_chat/shared-config';
import type { CallStoreSnapshot } from '@c_chat/shared-types';
import { app, BrowserWindow, shell } from 'electron';
import path, { join } from 'path';
import { storeTableClass } from '../../db';

type CallWindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
};

export class CallWindowManager {
  private static instance: CallWindowManager;

  private window: BrowserWindow | null = null;
  private lastSnapshot: CallStoreSnapshot | null = null;
  private ready = false;

  private constructor() {}

  static getInstance() {
    if (!CallWindowManager.instance) {
      CallWindowManager.instance = new CallWindowManager();
    }
    return CallWindowManager.instance;
  }

  open(snapshot?: CallStoreSnapshot) {
    if (snapshot) {
      this.lastSnapshot = snapshot;
    }

    const callWindow = this.ensureWindow();
    if (callWindow.isMinimized()) callWindow.restore();
    callWindow.focus();

    if (this.ready) {
      this.sendSnapshot();
    }

    return true;
  }

  sync(snapshot: CallStoreSnapshot) {
    this.lastSnapshot = snapshot;
    if (snapshot.activeCall && !this.isTerminal(snapshot.activeCall.state)) {
      this.open(snapshot);
      return;
    }
    this.sendSnapshot();
  }

  getSnapshot() {
    return this.lastSnapshot;
  }

  close() {
    this.window?.close();
  }

  destroy() {
    this.lastSnapshot = null;
    this.ready = false;

    if (!this.window || this.window.isDestroyed()) {
      this.window = null;
      return;
    }

    this.window.destroy();
    this.window = null;
  }

  private ensureWindow() {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    this.ready = false;
    const windowState = this.getWindowState();
    const defaults = this.getDefaultBounds();

    const callWindow = new BrowserWindow({
      ...defaults,
      ...windowState,
      minWidth: 360,
      minHeight: 520,
      backgroundColor: '#171717',
      show: false,
      frame: false,
      autoHideMenuBar: true,
      resizable: true,
      maximizable: false,
      fullscreenable: false,
      ...(process.platform === 'linux' ? { icon: join(process.resourcesPath, 'icon.png') } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        additionalArguments: [`${CALL_WINDOW_KEY}=${CALL_WINDOW_VALUE}`],
      },
    });

    callWindow.once('ready-to-show', () => {
      this.ready = true;
      callWindow.show();
      this.sendSnapshot();
    });

    callWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    if (!app.isPackaged) {
      const loadUrl = `http://localhost:${CALL_WINDOW_RENDERER_PORT}`;
      callWindow.loadURL(loadUrl).catch((err) => {
        console.log(`Call window load failed: ${(err as Error).message}`);
        setTimeout(() => {
          if (!callWindow.isDestroyed()) void callWindow.loadURL(loadUrl);
        }, 1000);
      });
    } else {
      const localPath = path.join(__dirname, '../call-window/index.html');
      callWindow.loadFile(localPath).catch((err) => {
        console.log(`Call window load failed: ${(err as Error).message}`);
      });
    }

    callWindow.on('close', () => {
      this.saveWindowState(callWindow);
    });

    callWindow.on('closed', () => {
      this.window = null;
      this.ready = false;
    });

    this.window = callWindow;
    return callWindow;
  }

  private sendSnapshot() {
    if (!this.window || this.window.isDestroyed() || !this.lastSnapshot) return;
    this.window.webContents.send(ELECTRON_TO_CLIENT_CHANNELS.CallStateUpdated, this.lastSnapshot);
  }

  private isTerminal(state?: string | null) {
    return (
      state === 'ended' ||
      state === 'rejected' ||
      state === 'cancelled' ||
      state === 'timeout' ||
      state === 'busy' ||
      state === 'failed'
    );
  }

  private getDefaultBounds() {
    return { width: 420, height: 640 };
  }

  private getWindowState(): Partial<CallWindowState> {
    const state = storeTableClass.getStore<CallWindowState>(db.store.CALL_WINDOW_STATE, {
      windowId: db.GLOBAL_WINDOW_ID,
    });

    return state ?? {};
  }

  private saveWindowState(window: BrowserWindow) {
    const bounds = window.getBounds();
    storeTableClass.setStore(
      db.store.CALL_WINDOW_STATE,
      {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      { windowId: db.GLOBAL_WINDOW_ID },
    );
  }
}
