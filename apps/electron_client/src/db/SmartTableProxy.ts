import { DatabaseManager } from './DatabaseManager';
import { TableConnection } from './Table';

export class SmartTableProxy<T extends TableConnection> {
  private tableName: string;
  private databaseManager: DatabaseManager;

  constructor(tableName: string, databaseManager: DatabaseManager) {
    this.tableName = tableName;
    this.databaseManager = databaseManager;
  }

  createProxy(): T {
    return new Proxy<T>({} as T, {
      get: (_, prop) => {
        if (typeof prop === 'string') {
          return (...args: any[]) => this.routeMethod(prop, args);
        }
        return undefined;
      },
    });
  }

  /**
   * 执行表方法调用
   * @param targetTable 目标表实例
   * @param methodName 方法名
   * @param args 方法参数
   * @returns 方法执行结果
   */
  private executeTableMethod(targetTable: TableConnection, methodName: string, args: any[]): any {
    const method = (targetTable as any)[methodName];
    if (typeof method === 'function') {
      return method.apply(targetTable, args);
    } else {
      console.error(`表 ${this.tableName} 没有方法 ${methodName}`);
      return undefined;
    }
  }

  /**
   * 路由方法调用到正确的表实例
   * @param methodName 方法名
   * @param args 方法参数
   */
  private routeMethod(methodName: string, args: any[]): any {
    const targetTable = this.databaseManager.getGlobalTable(this.tableName);
    if (!targetTable) {
      return;
    }
    return this.executeTableMethod(targetTable, methodName, args);
  }
}
