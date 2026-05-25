import type { ErrorReporter } from '@c_chat/shared-api';
import { WindowManager } from '../../../main/windows';

/**
 * 把 HTTP 错误 toast 到发起请求的那个窗口（多账号场景按 windowId 路由）。
 * 没有 windowId 时静默——通常发生在 app 启动期 init 阶段的请求。
 */
export const electronErrorReporter: ErrorReporter = {
  report({ message, ctx }) {
    const windowId = ctx?.windowId;
    if (!windowId || typeof windowId !== 'number') {
      return;
    }
    WindowManager.showToast(windowId, 'error', message);
  },
};
