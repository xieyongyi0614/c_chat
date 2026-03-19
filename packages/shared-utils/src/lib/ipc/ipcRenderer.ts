import { IPC_CONFIG } from '@c_chat/shared-config';
import type { IpcMessage, IpcResponse } from '@c_chat/shared-types';
type IpcMethods = object;

interface MethodCallRecord {
  count: number;
  lastCallTime: number;
  firstCallTime: number;
  lastPrintTime: number;
}

class DevMethodTracker {
  private callRecords = new Map<string, MethodCallRecord>();

  // 避免警告频繁打印
  private readonly PRINT_INTERVAL = 5000;
  // 调用次数的统计时间窗口
  private readonly DEBOUNCE_THRESHOLD = 1000;
  // 同一方法调用阈值
  private readonly MIN_CALL_COUNT = 3;

  track(methodName: string, params: any[]): void {
    const now = Date.now();
    const record = this.callRecords.get(methodName);

    if (!record) {
      this.callRecords.set(methodName, {
        count: 1,
        lastCallTime: now,
        firstCallTime: now,
        lastPrintTime: 0,
      });
      return;
    }

    if (now - record.firstCallTime > this.DEBOUNCE_THRESHOLD) {
      this.callRecords.set(methodName, {
        count: 1,
        lastCallTime: now,
        firstCallTime: now,
        lastPrintTime: record.lastPrintTime,
      });
      return;
    }

    record.count++;
    record.lastCallTime = now;

    if (record.count >= this.MIN_CALL_COUNT) {
      this.printStackTrace(methodName, params, record);
    }
  }

  private printStackTrace(methodName: string, params: any[], record: MethodCallRecord): void {
    const now = Date.now();
    if (now - record.lastPrintTime < this.PRINT_INTERVAL) {
      return;
    }

    const stack = new Error().stack;
    const duration = record.lastCallTime - record.firstCallTime;

    console.group(`IPC方法短时内重复调用警告, ${duration}ms内调用${record.count}次`);
    console.log(`方法名: ${methodName}`);
    console.log(`参数: ${JSON.stringify(params)}`);
    console.log('调用堆栈:');
    console.log(stack);
    console.groupEnd();

    record.lastPrintTime = now;
  }
}

class RendererIpcClient<T extends IpcMethods = IpcMethods> {
  private callId = 0;

  // 缓存代理方法, 避免重复创建, 优化性能
  private proxyCache: T | null = null;

  private devTracker: DevMethodTracker | null = null;

  constructor() {
    if (this.isDev()) {
      this.devTracker = new DevMethodTracker();
    }
  }

  private isDev(): boolean {
    return typeof window !== 'undefined' && (window as any).__DEV__;
  }

  // 当调用方法时, 生成唯一的调用 ID, 用于标识请求和响应
  private generateId(): string {
    return `call_${++this.callId}_${Date.now()}`;
  }

  /**
   * 调用 IPC 方法
   * @param method IPC 方法名
   * @param params 方法参数
   * @returns 方法返回值
   */
  public async call<T extends keyof IpcMethods>(
    method: any,
    ...params: any
  ): Promise<ReturnType<IpcMethods[T]>> {
    this.devTracker?.track(String(method), params);
    // switch (method) {
    //   case 'getId':
    //     return window[IPC_CONFIG.API_NAME].id;
    //   case 'getWindowId':
    //     return window[IPC_CONFIG.API_NAME].windowId;
    //   default:
    //     break;
    // }

    const id = this.generateId();
    const message: IpcMessage<T> = { method, params, id };
    const response = (await this.sendIpcMessage(message)) as IpcResponse<ReturnType<IpcMethods[T]>>;
    if (response.id !== id) {
      throw new Error('ipc response id not match');
    }

    if (response.error) {
      return Promise.reject(response.error);
    }

    return response.data as ReturnType<IpcMethods[T]>;
  }

  private async sendIpcMessage(message: IpcMessage): Promise<IpcResponse> {
    return await window[IPC_CONFIG.API_NAME].ipcCall(message);
  }

  private fetch = {
    requestApi: (...args: any[]) => this.call('requestApi', ...args),
    get: (...args: any[]) => this.call('getFetch', ...args),
    post: (...args: any[]) => this.call('postFetch', ...args),
    delete: (...args: any[]) => this.call('deleteFetch', ...args),
    put: (...args: any[]) => this.call('putFetch', ...args),
    upload: (...args: any[]) => this.call('uploadFetch', ...args),
    download: (...args: any[]) => this.call('downloadFetch', ...args),
    postDownload: (...args: any[]) => this.call('postDownloadFetch', ...args),
  };

  private logger = {
    info: (...args: any[]) => this.call('logInfo', ...args),
    error: (...args: any[]) => this.call('logError', ...args),
    warn: (...args: any[]) => this.call('logWarn', ...args),
    debug: (...args: any[]) => this.call('logDebug', ...args),
    consoleOnly: (...args: any[]) => this.call('logConsoleOnly', ...args),
    fileOnly: (...args: any[]) => this.call('logFileOnly', ...args),
    reported: (...args: any[]) => this.call('logReported', ...args),
    trackModuleAction: (...args: any[]) => this.call('logTrackModuleAction', ...args),
  };

  /**
   * 创建代理对象, 方便调用
   * @returns IPC 方法代理对象
   */
  public createProxy(): T {
    if (this.proxyCache) {
      return this.proxyCache;
    }

    this.proxyCache = new Proxy({} as T, {
      get: (_, prop) => {
        if (typeof prop === 'string') {
          // 特殊处理 fetch 属性
          if (prop === 'fetch') return this.fetch;
          if (prop === 'logger') return this.logger;
          return (...args: any[]) => {
            return this.call(prop, ...args);
          };
        }
        return undefined;
      },
    });

    return this.proxyCache as T;
  }

  public reset(): void {
    this.callId = 0;
    this.proxyCache = null;
    this.devTracker = null;
  }
}

export function createIpcClient<T extends IpcMethods = IpcMethods>() {
  return new RendererIpcClient<T>().createProxy();
}
