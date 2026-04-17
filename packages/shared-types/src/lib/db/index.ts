export * from './storeTable';
export * from './ConversationTable';
export * from './MessageTable';

/**
 * TableConnection 定位参数类型
 * 用于 SmartTableProxy 自动定位到正确的表实例
 *
 * 这些参数不需要在方法签名中声明，但在调用时可以传入
 * SmartTableProxy 会自动提取这些参数用于定位表实例
 */
export interface TableLocateParams {
  /** 窗口ID，用于从窗口获取 seatId */
  windowId?: number;
  /** 坐席ID，直接指定坐席 */
  seatId?: string;
}

/**
 * TableConnection 的所有方法添加定位参数支持
 *
 * 这个类型工具允许所有 TableConnection 的方法在调用时
 * 可以传入额外的 { windowId?, seatId? } 参数，即使方法签名中没有声明
 *
 * 对于无参数方法：添加定位参数作为可选参数
 * 对于有参数的方法：在参数列表末尾添加定位参数作为可选参数
 *
 * @template T - 必须是一个包含方法的对象类型（通常是 TableConnection 的子类）
 */
export type TableConnectionParams<T extends { [K in keyof T]: T[K] }> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? // 对于无参数方法：添加定位参数支持
      Args extends readonly []
      ? T[K] & ((params?: TableLocateParams) => Return)
      : // 对于有参数的方法：在参数列表末尾添加定位参数
        T[K] & ((...args: [...Args, TableLocateParams?]) => Return)
    : T[K]; // 非方法属性，保持原样
};
