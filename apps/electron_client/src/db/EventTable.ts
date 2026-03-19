/**
 * 支持事件发送的数据库连接类
 * 继承自 TableConnection，自动发送数据库变更事件
 */

import BetterSqlite3 from 'better-sqlite3';
import { TableConnection } from './Table';

export abstract class EventTableConnection<T> extends TableConnection {
  // protected eventTool: DatabaseEventTool<T>;

  constructor(db?: BetterSqlite3.Database) {
    super(db);
    // this.eventTool = new DatabaseEventTool(customEventBus || eventBus);
  }

  /**
   * 运行一条 SQL 查询，返回单条记录
   * @param sql SQL 查询语句
   * @param params 查询参数
   * @returns 查询结果
   */
  protected get<P extends unknown[] = unknown[], T = unknown>(
    sql: string,
    params = [] as unknown as P,
  ): T | undefined {
    const result = super.get<P, T>(sql, params);
    // this.eventTool.handleDatabaseOperation(sql, params);
    return result;
  }

  /**
   * 运行一条 SQL 查询，返回多条记录
   * @param sql SQL 查询语句
   * @param params 查询参数
   * @returns 查询结果数组
   */
  protected all<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const results = super.all<T>(sql, params);
    // this.eventTool.handleDatabaseOperation(sql, params, results.length);
    return results;
  }

  /**
   * 执行一条 SQL 命令（如 INSERT、UPDATE、DELETE）
   * @param sql SQL 命令语句
   * @param params 命令参数
   * @returns 执行结果
   */
  protected run<P extends unknown[]>(sql: string, params = [] as unknown as P) {
    const result = super.run<P>(sql, params);
    // this.eventTool.handleDatabaseOperation(sql, params, result.changes);
    return result;
  }

  // ========== 新增的 Table API 方法，带事件支持 ==========

  /**
   * 检查表是否存在
   * @returns 表是否存在
   */
  protected tableExists(): boolean {
    const result = super.tableExists();
    // this.eventTool.handleDatabaseOperation(
    //   `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
    //   [this.TABLE_NAME],
    // );
    return result;
  }

  /**
   * 清空表数据
   * @returns 执行结果
   */
  protected clearTable(): BetterSqlite3.RunResult | undefined {
    const result = super.clearTable();
    // this.eventTool.handleDatabaseOperation(`DELETE FROM ${this.TABLE_NAME}`, []);
    return result;
  }

  /**
   * 删除表
   * @returns 执行结果
   */
  protected dropTable(): BetterSqlite3.RunResult | undefined {
    const result = super.dropTable();
    // this.eventTool.handleDatabaseOperation(`DROP TABLE IF EXISTS ${this.TABLE_NAME}`, []);
    return result;
  }

  /**
   * 添加列，如果不存在
   * @param columnName 列名
   * @param columnDefinition 列定义
   */
  protected addColumnIfNotExists(columnName: string, columnDefinition: string) {
    super.addColumnIfNotExists(columnName, columnDefinition);
    // this.eventTool.handleDatabaseOperation(
    //   `ALTER TABLE ${this.TABLE_NAME} ADD COLUMN ${columnName} ${columnDefinition}`,
    //   [],
    // );
  }
}
