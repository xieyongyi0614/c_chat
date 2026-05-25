import type { AxiosRequestConfig } from 'axios';
import type {
  CChatAxiosRequestConfig,
  RequestContext,
  RequestContextResolver,
} from '@c_chat/shared-api';
import { getActionCtx } from '../../../ipc/actionContext';

/**
 * windowId 解析优先级：
 *   1. 调用方手动传的 `config.ctx.windowId`
 *   2. 当前 IPC 处理链路上挂的 ActionCtx（AsyncLocalStorage）
 * 不再从 config.data / config.params 里挖 windowId（那是泄漏到 payload 的 hack）。
 */
export const electronContextResolver: RequestContextResolver = {
  resolve(config: AxiosRequestConfig): RequestContext | null {
    const explicit = (config as CChatAxiosRequestConfig).ctx?.windowId;
    if (explicit) {
      return { windowId: Number(explicit) };
    }

    const ctxWindowId = getActionCtx()?.windowId;
    if (ctxWindowId) {
      return { windowId: ctxWindowId };
    }

    return null;
  },
};
