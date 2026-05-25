import type { AxiosRequestConfig } from 'axios';
import type { RequestContext } from './requestContext';

/**
 * 从 axios 配置反推请求上下文。
 * Electron 实现里通常会读 `(config as CChatAxiosRequestConfig).ctx`，
 * 兜底走 AsyncLocalStorage 拿 windowId；其他平台基本可以返回 null。
 */
export interface RequestContextResolver {
  resolve(config: AxiosRequestConfig): RequestContext | null;
}
