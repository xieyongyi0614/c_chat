import { AsyncLocalStorage } from 'async_hooks';

export type ActionCtx = {
  windowId: number;
  webContentId?: number;
};

const actionContext = new AsyncLocalStorage<ActionCtx>();

export const runWithActionCtx = <T>(ctx: ActionCtx, callback: () => T): T => {
  return actionContext.run(ctx, callback);
};

export const getActionCtx = () => actionContext.getStore();
