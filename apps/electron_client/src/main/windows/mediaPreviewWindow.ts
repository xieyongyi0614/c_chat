import {
  ELECTRON_TO_CLIENT_CHANNELS,
  MEDIA_PREVIEW_RENDERER_PORT,
  MEDIA_PREVIEW_WINDOW_KEY,
  MEDIA_PREVIEW_WINDOW_VALUE,
} from '@c_chat/shared-config';
import type { MediaPreviewPayload } from '@c_chat/shared-types';
import { app, BrowserWindow, shell } from 'electron';
import path, { join } from 'path';

export class MediaPreviewWindowManager {
  private static instance: MediaPreviewWindowManager;

  private window: BrowserWindow | null = null;
  private lastPayload: MediaPreviewPayload | null = null;
  private ready = false;

  private constructor() {}

  static getInstance() {
    if (!MediaPreviewWindowManager.instance) {
      MediaPreviewWindowManager.instance = new MediaPreviewWindowManager();
    }
    return MediaPreviewWindowManager.instance;
  }

  open(payload: MediaPreviewPayload) {
    this.lastPayload = this.normalizePayload(payload);
    const previewWindow = this.ensureWindow();

    if (previewWindow.isMinimized()) previewWindow.restore();
    previewWindow.focus();

    if (this.ready) {
      this.sendPayload();
    }

    return true;
  }

  getPayload() {
    return this.lastPayload;
  }

  close() {
    this.window?.close();
  }

  private ensureWindow() {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    this.ready = false;

    const previewWindow = new BrowserWindow({
      width: 960,
      height: 720,
      minWidth: 640,
      minHeight: 480,
      backgroundColor: '#111111',
      show: false,
      frame: false,
      autoHideMenuBar: true,
      resizable: true,
      maximizable: true,
      fullscreenable: true,
      ...(process.platform === 'linux' ? { icon: join(process.resourcesPath, 'icon.png') } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        additionalArguments: [`${MEDIA_PREVIEW_WINDOW_KEY}=${MEDIA_PREVIEW_WINDOW_VALUE}`],
      },
    });

    previewWindow.once('ready-to-show', () => {
      this.ready = true;
      previewWindow.show();
      this.sendPayload();
    });

    previewWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    if (!app.isPackaged) {
      const loadUrl = `http://localhost:${MEDIA_PREVIEW_RENDERER_PORT}`;
      previewWindow.loadURL(loadUrl).catch((err) => {
        console.log(`Media preview window load failed: ${(err as Error).message}`);
        setTimeout(() => {
          if (!previewWindow.isDestroyed()) void previewWindow.loadURL(loadUrl);
        }, 1000);
      });
    } else {
      const localPath = path.join(__dirname, '../media-preview/index.html');
      previewWindow.loadFile(localPath).catch((err) => {
        console.log(`Media preview window load failed: ${(err as Error).message}`);
      });
    }

    previewWindow.on('closed', () => {
      this.window = null;
      this.ready = false;
    });

    this.window = previewWindow;
    return previewWindow;
  }

  private sendPayload() {
    if (!this.window || this.window.isDestroyed() || !this.lastPayload) return;
    this.window.webContents.send(
      ELECTRON_TO_CLIENT_CHANNELS.MediaPreviewPayloadUpdated,
      this.lastPayload,
    );
  }

  private normalizePayload(payload: MediaPreviewPayload): MediaPreviewPayload {
    const items = payload.items ?? [];
    const maxIndex = Math.max(0, items.length - 1);
    const initialIndex = Math.max(0, Math.min(payload.initialIndex ?? 0, maxIndex));
    return {
      ...payload,
      items,
      initialIndex,
    };
  }
}
