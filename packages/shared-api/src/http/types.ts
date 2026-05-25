import type { AxiosRequestConfig } from 'axios';
import type { RequestContext } from '../adapters/requestContext';

/**
 * c_chat 扩展过的 axios 请求配置：
 * - `ctx`：调用方手动指定的请求上下文，会被透传到 TokenProvider / ErrorReporter
 * - `skipAuth`：跳过 Authorization header 注入（登录、注册等接口用）
 */
export interface CChatAxiosRequestConfig extends AxiosRequestConfig {
  ctx?: RequestContext;
  skipAuth?: boolean;
}
