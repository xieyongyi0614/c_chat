import {
  IPC_CONFIG,
  IpcMessage,
  IpcMethodParams,
  IpcResponse,
  IpcTypes,
} from '@c_chat/shared-config';
import { ipcMain } from 'electron';
import { isPlainObject } from 'lodash';

// action注入的上下文类型
export type ActionCtx = {
  // event: Electron.IpcMainInvokeEvent;
  windowId: number;
  webContentId?: number;
};

// 需要适配的参数类型有哪些？
enum ParamType {
  NoParams, // 无参数
  SingleObject, // 单个json对象
  SingleValue, // 单个值
  MultipleParams, // 多个参数
}

// 辅助类型：更精确的对象检查
type IsPlainObject<T> =
  T extends Record<string, any> ? (T extends readonly any[] ? false : true) : false;

// 分步骤的类型处理
type ExtractParams<T> = T extends (...args: infer P) => any ? P : never;
type ExtractReturn<T> = T extends (...args: any[]) => infer R ? R : never;

// 参数处理策略
type ParamStrategy<P extends readonly any[]> = P['length'] extends 0
  ? ParamType.NoParams
  : P['length'] extends 1
    ? IsPlainObject<P[0]> extends true
      ? ParamType.SingleObject
      : ParamType.SingleValue
    : ParamType.MultipleParams;

// 主要的ActionHandler类型
type ActionHandler<K extends keyof IpcTypes> = {
  [ParamType.NoParams]: (actionCtx: ActionCtx) => ExtractReturn<IpcTypes[K]>;
  [ParamType.SingleObject]: (
    params: ExtractParams<IpcTypes[K]>[0] & ActionCtx,
  ) => ExtractReturn<IpcTypes[K]>;
  [ParamType.SingleValue]: (
    param: ExtractParams<IpcTypes[K]>[0],
    actionCtx: ActionCtx,
  ) => ExtractReturn<IpcTypes[K]>;
  [ParamType.MultipleParams]: (
    ...params: [...ExtractParams<IpcTypes[K]>, ActionCtx]
  ) => ExtractReturn<IpcTypes[K]>;
}[ParamStrategy<ExtractParams<IpcTypes[K]>>];

type AddActionHandlerType = <K extends keyof IpcTypes>(name: K, handler: ActionHandler<K>) => void;

type ActionsMap = {
  [K in keyof IpcTypes]: ActionHandler<K>;
};
// 存储所有注册的事件处理器
export const actions = {} as ActionsMap;
/**
 * 添加动作处理器 - 用于Electron IPC函数注册前的二次增强
 * @param eventName 事件名称
 * @param handler 原始处理函数
 */
export const addActionHandler: AddActionHandlerType = (name, handler) => {
  // 将事件名和增强后的函数存储到events对象中
  actions[name] = handler as ActionsMap[typeof name];
  console.log('addActionHandler', name, handler);
};

export const initActions = () => {
  ipcMain.handle(IPC_CONFIG.CHANNEL_NAME, async (_, ...args): Promise<IpcResponse> => {
    const message: IpcMessage = args[0];
    try {
      if (!args.length) {
        return {
          id: '',
          error: 'No arguments',
        };
      }
      // const { windowId, webContentId } = message;
      // const actionCtx: ActionCtx = {
      //   // event, // 有序列化问题， 后续需要再加上
      //   windowId,
      //   webContentId,
      // };
      const call = actions[message.method];
      console.log('ipc handle', message, typeof call, actions);

      switch (typeof call) {
        case 'function': {
          const params = message.params as IpcMethodParams<typeof call>;
          let result;
          // 如果无参数
          // if (!params?.length) {
          //   result = await call(actionCtx);
          //   // 如果是单个对象
          // } else if (params?.length === 1 && isPlainObject(params?.[0])) {
          //   result = await call({ ...actionCtx, ...params[0] });
          // } else {
          //   result = await call(...params, actionCtx);
          // }
          console.log(params, 'function');

          return {
            id: message.id,
            data: result,
          };
        }
        default:
          console.log(`[${message.method}] 该ipc事件未注册`);
          break;
      }

      const methodList = Object.entries(actions)
        .map(([key, value]) => `${key}: ${typeof value}`)
        .join('\n  ');
      const errorMessage =
        `Method '${JSON.stringify(message)}' not found.\n` +
        `Available methods:\n  ${methodList}\n`;

      return {
        id: message.id,
        error: errorMessage,
      };
    } catch (error: any) {
      return { id: message.id, error };
    }
  });
};
