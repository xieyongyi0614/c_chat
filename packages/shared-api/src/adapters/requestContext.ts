/**
 * 平台无关的请求上下文。
 * - Electron 多账号场景下 `windowId` 用来定位 token / toast 目标窗口
 * - Web / React Native 端通常不需要 windowId，留空即可
 * - 允许任意扩展字段，供 ErrorReporter / TokenProvider 自定义使用
 */
export interface RequestContext {
  windowId?: number;
  [key: string]: unknown;
}
