import BetterSqlite3 from 'better-sqlite3';
import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { TableBelong, TableConnection } from './Table';
import { SmartTableProxy } from './SmartTableProxy';
import { TableConnectionParams } from '@c_chat/shared-types';

const DB_VERSION = 2;
export class DatabaseManager {
  private globalDb: BetterSqlite3.Database | undefined;
  private globalTables: Map<string, TableConnection> = new Map();
  private tableConstructors: Map<string, new () => TableConnection> = new Map();

  async initGlobalDb() {
    if (this.globalDb) {
      console.log('全局数据库已初始化');
      return;
    }
    const dbPath = this.getGlobalDbPath();

    console.log(`全局数据库文件路径:`, dbPath);

    this.ensureDirectoryExists(dirname(dbPath));
    this.globalDb = new BetterSqlite3(resolve(dbPath));
    await this.dbInit(dbPath, this.globalDb);
  }

  /**
   * 初始化数据库
   * @param db 数据库实例
   */
  private async dbInit(dbPath: string, db: BetterSqlite3.Database): Promise<void> {
    let oldVersion = 0;
    try {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS version (id INTEGER PRIMARY KEY AUTOINCREMENT, version INTEGER NOT NULL DEFAULT 0)`,
      ).run();

      const row = db
        .prepare<[], { version: number }>(`SELECT version FROM version ORDER BY id DESC LIMIT 1`)
        .get();
      oldVersion = row?.version ?? 0;
    } catch (error) {
      console.error('Error fetching current version:', error);
    }
    const tables: TableConnection[] = [];
    for (const [tableName, TableClass] of this.tableConstructors) {
      const instance = new TableClass();

      try {
        if (instance.belongTo === TableBelong.GLOBAL) {
          instance.setup(db);
          tables.push(instance);
          instance.createTable();

          const key = tableName;
          this.globalTables.set(key, instance);
          console.log(`创建表实例(${key}): ${tableName} (belongTo: ${instance.belongTo})`);
        }
      } catch (error) {
        console.error(`创建表实例: ${tableName} 失败:`, error);
        throw error;
      }
    }
    const newVersion = DB_VERSION;
    if (oldVersion === newVersion) {
      return;
    }

    console.log('开始数据库迁移:', oldVersion, '->', newVersion);

    if (oldVersion < newVersion) {
      for (const table of tables) {
        table.migrate(oldVersion, newVersion);
      }
    } else {
      // TODO 正式环境需要考虑是否要删除数据库文件并重新创建
      console.error('数据库版本错误:', oldVersion, '->', newVersion);
      throw new Error('数据库版本错误');
    }

    db.prepare('INSERT INTO version (version) VALUES (?)').run(newVersion);
    console.log('数据库迁移完成:', oldVersion, '->', newVersion);
  }
  /**
   * 注册表构造函数
   * @param TableClass 表类构造函数
   * @returns 智能表代理
   */
  registerTableClass<T extends TableConnection>(TableClass: new () => T) {
    const tempInstance = new TableClass();
    const tableName = tempInstance.TABLE_NAME;
    this.tableConstructors.set(tableName, TableClass);
    const smartProxy = new SmartTableProxy<T>(tableName, this);
    return smartProxy.createProxy() as TableConnectionParams<T>;
  }

  /**
   * 获取全局表实例
   * @param tableName 表名
   */
  getGlobalTable(tableName: string): TableConnection | undefined {
    return this.globalTables.get(tableName);
  }

  /**
   * 获取数据库根目录路径
   */
  public getDatabaseRootPath(): string {
    return join(app.getPath('userData'), 'database');
  }

  /**
   * 获取全局数据库路径
   */
  public getGlobalDbPath(): string {
    const dbRoot = this.getDatabaseRootPath();
    return join(dbRoot, 'global.db');
  }
  /**
   * 确保目录存在
   * @param dirPath 目录路径
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
}

export const dbManager = new DatabaseManager();
