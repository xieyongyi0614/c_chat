import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { dbManager } from './DatabaseManager';
import { StoreTable } from './table/StoreTable';

// 数据库存放路径（用户数据目录）
// const dbPath = path.join(app.getPath('userData'), 'cache.db');
// const db = new Database(dbPath, { verbose: false });

// // 初始化表（例如缓存表）
// db.exec(`
//   CREATE TABLE IF NOT EXISTS cache (
//     key TEXT PRIMARY KEY,
//     value TEXT,
//     expires_at INTEGER
//   )
// `);

// // 导出数据库实例
// export default db;
export const storeTableClass = dbManager.registerTableClass(StoreTable);
dbManager.initGlobalDb();
