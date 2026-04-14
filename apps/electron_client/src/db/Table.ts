import BetterSqlite3 from 'better-sqlite3';

export const TableBelong = {
  GLOBAL: 'global',
  SEAT: 'seat',
} as const;

export type TableBelongType = (typeof TableBelong)[keyof typeof TableBelong];

export abstract class TableConnection {
  db?: BetterSqlite3.Database;
  abstract readonly TABLE_NAME: string;

  // 数据表归属
  readonly belongTo: TableBelongType = TableBelong.GLOBAL;

  constructor(db?: BetterSqlite3.Database) {
    this.db = db;
  }

  setup(db: BetterSqlite3.Database) {
    this.db = db;
  }

  abstract createTable(): unknown;

  /**
   * 迁移数据表
   */
  migrate(_oldVersion: number, _newVersion: number): void {}

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
    try {
      const result = this.db?.prepare(sql).get(params);
      return result as T | undefined; // 使用类型断言，确保返回值符合泛型 T
    } catch (error) {
      console.error('Error executing get query:', error);
      throw error;
    }
  }

  /**
   * 运行一条 SQL 查询，返回多条记录
   * @param sql SQL 查询语句
   * @param params 查询参数
   * @returns 查询结果数组
   */
  protected all<T = unknown>(sql: string, params: unknown[] = []): T[] {
    try {
      const results = this.db?.prepare(sql).all(params);
      return results as T[]; // 使用类型断言，确保返回值符合泛型 T[]
    } catch (error) {
      console.error('Error executing all query:', error, params);
      throw error;
    }
  }

  /**
   * 执行一条 SQL 命令（如 INSERT、UPDATE、DELETE）
   * @param sql SQL 命令语句
   * @param params 命令参数
   * @returns 执行结果
   */
  protected run<P extends unknown[]>(sql: string, params = [] as unknown as P) {
    try {
      return this.db?.prepare(sql).run(params);
    } catch (error) {
      console.error('Error executing run query:', error, params);
      throw error;
    }
  }

  /**
   * 添加列，如果不存在
   * @param columnName 列名
   * @param columnDefinition 列定义
   * @returns
   * */
  protected addColumnIfNotExists(columnName: string, columnDefinition: string) {
    const columnExistsQuery = `
    PRAGMA table_info(${this.TABLE_NAME})
  `;
    const columns = this.all(columnExistsQuery);

    const columnExists = columns.some((col: any) => col.name === columnName);
    if (!columnExists) {
      const alterTableSQL = `ALTER TABLE ${this.TABLE_NAME} ADD COLUMN ${columnName} ${columnDefinition}`;
      this.run(alterTableSQL);
    }
  }

  /**
   * 检查表是否存在
   * @returns 表是否存在
   */
  protected tableExists(): boolean {
    try {
      const result = this.get<unknown[], { count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
        [this.TABLE_NAME],
      );
      return !!result?.count && result?.count > 0;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  /**
   * 清空表数据
   * @returns 执行结果
   */
  protected clearTable(): BetterSqlite3.RunResult | undefined {
    return this.run(`DELETE FROM ${this.TABLE_NAME}`);
  }

  /**
   * 删除表
   * @returns 执行结果
   */
  protected dropTable(): BetterSqlite3.RunResult | undefined {
    return this.run(`DROP TABLE IF EXISTS ${this.TABLE_NAME}`);
  }
}
