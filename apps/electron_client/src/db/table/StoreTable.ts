import BetterSqlite3 from 'better-sqlite3';
import { EventTableConnection } from '../EventTable';
import { db } from '@c_chat/shared-config';
import { StoreTableTypes } from '@c_chat/shared-types';
import { safeJsonParse, safeJsonStringify } from '@c_chat/shared-utils';

const DEFAULT_LANGUAGE = 'en';

export class StoreTable extends EventTableConnection<StoreTableTypes.StoreItem> {
  readonly TABLE_NAME = db.tableNames.STORE_TABLE;

  private languageCache: Map<number, string> = new Map();

  createTable() {
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
      key TEXT,
      window_id INTEGER DEFAULT 0,
      value TEXT,
      expiry DATETIME,
      UNIQUE(key, window_id)
    )
    `;

    this.run(createTableSQL);
  }

  getAccessToken(windowId: number) {
    return this.getStore<string>(db.store.ACCESS_TOKEN, { windowId });
  }

  setAccessToken(accessToken: string, windowId: number) {
    this.setStore(db.store.ACCESS_TOKEN, accessToken, { windowId });
  }

  getRefreshToken(windowId: number) {
    return this.getStore<string>(db.store.REFRESH_TOKEN, { windowId });
  }

  setRefreshToken(refreshToken: string, windowId: number) {
    this.setStore(db.store.REFRESH_TOKEN, refreshToken, { windowId });
  }

  // getLanguage(windowId = 0): string {
  //   const cacheKey = windowId;
  //   let language = this.languageCache.get(cacheKey);
  //   if (language) {
  //     return language;
  //   }

  //   language = this.getStore<string>(db.store.LANGUAGE, { windowId });
  //   this.languageCache.set(cacheKey, language);
  //   return language ?? DEFAULT_LANGUAGE;
  // }

  // setLanguage(language: string, windowId = 0) {
  //   const cacheKey = windowId ?? 0;
  //   this.languageCache.set(cacheKey, language);
  //   this.setStore(db.store.LANGUAGE, language, { windowId });
  //   platformCacheService.preload(language);
  // }

  // getThemeMode(windowId = 0): string {
  //   return this.getStore<string>(db.store.THEME_MODE, { windowId });
  // }

  // setThemeMode(themeMode: string, windowId = 0) {
  //   this.setStore(db.store.THEME_MODE, themeMode, { windowId });
  // }

  getStore<T = unknown>(
    key: StoreTableTypes.StoreKey,
    options?: {
      windowId?: number;
      defaultValue?: T;
    },
  ): T | undefined {
    const query = `SELECT value, expiry FROM ${this.TABLE_NAME} WHERE key = ? AND window_id = ?`;
    const { windowId = 0, defaultValue } = options || {};

    const result = this.get<[string, number], StoreTableTypes.StoreItem>(query, [key, windowId]);

    // 检查是否存在
    if (!result) {
      return defaultValue;
    }

    const currentTime = new Date(); // 当前时间

    // 检查是否过期
    if (result.expiry && new Date(result.expiry) < currentTime) {
      this.deleteStore(key); // 删除过期数据
      return defaultValue; // 返回默认值
    }

    return safeJsonParse(result.value, undefined);
  }

  // private emitStoreListener(key: StoreKey | string, value: unknown, windowId: number) {
  //   if (windowId === 0) {
  //     // ipcMain.emit('storeListener', key, value);

  //     // ipcMain.emit('storeListener', ipcRenderer,{key, value,windowId});
  //     const map = this.getStore<OpenWindowMap[]>(db.store.OPEN_WINDOW_MAP);
  //     if (map && map.length > 0) {
  //       for (const i of map) {
  //         console.log('emitStoreListener', { key, value, windowId: i.id });

  //         // ipcMain.emit(`${i.id}:storeListener`, key, value);
  //         // console.log('emitStoreListener',{key, value,windowId:i.id});
  //         ipcMain.emit('storeListener', undefined, {
  //           key,
  //           value,
  //           windowId: i.id,
  //         });
  //       }
  //     }
  //   } else {
  //     // ipcMain.emit(`${windowId}:storeListener`, key, value);
  //     ipcMain.emit('storeListener', undefined, { key, value, windowId });
  //   }
  // }

  setStore(
    key: StoreTableTypes.StoreKey,
    value: any,
    options?: { exp?: number | null; windowId?: number },
  ) {
    const { windowId = 0, exp } = options || {};
    if (value === null || value === undefined) {
      return this.deleteStore(key, windowId);
    }

    const newValue = safeJsonStringify(value);
    const expiry = exp ? new Date(Date.now() + exp * 1000).toISOString() : null; // 计算过期时间（ISO 8601 格式）

    const upsertSQL = `
      INSERT INTO ${this.TABLE_NAME} (key, window_id, value, expiry)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key, window_id) DO UPDATE SET value = excluded.value, expiry = excluded.expiry
    `;

    const result = this.run(upsertSQL, [key, windowId, newValue, expiry]);

    // this.emitStoreListener(key, JSON.parse((newValue as any) ?? null), windowId);

    return result;
  }

  deleteStore(key: StoreTableTypes.StoreKey, windowId = 1) {
    const deleteSQL = `DELETE FROM ${this.TABLE_NAME} WHERE key = ? AND window_id = ?`;
    // this.emitStoreListener(key, null, windowId);
    return this.run(deleteSQL, [key, windowId]);
  }

  getAllStore<T = unknown>(
    key: StoreTableTypes.StoreKey,
  ): Array<{ window_id: number; value: T; expiry: string | null }> {
    const query = `SELECT value, expiry, window_id FROM ${this.TABLE_NAME} WHERE key = ?`;
    const results = this.all<Omit<StoreTableTypes.StoreItem, 'key'>>(query, [key]);

    if (!results || results.length === 0) {
      return [];
    }

    const currentTime = new Date();
    const validResults: Array<Omit<StoreTableTypes.StoreItem, 'value'> & { value: T }> = [];

    for (const result of results) {
      if (result.expiry && new Date(result.expiry) < currentTime) {
        this.deleteStore(key, result.window_id);
      } else {
        validResults.push({
          window_id: result.window_id,
          value: safeJsonParse<T>(result.value) as T,
          expiry: result.expiry,
          key,
        });
      }
    }

    return validResults;
  }
}
