import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import * as https from 'https';
import type { IncomingMessage } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { app } from 'electron';
import { WindowManager } from '@c_chat/electron_client/main/windows';
import { storeTableClass } from '@c_chat/electron_client/db';
import { getActionCtx } from '@c_chat/electron_client/ipc/actionContext';

interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

export interface CChatAxiosRequestConfig extends AxiosRequestConfig {
  windowId?: number;
  skipAuth?: boolean;
}

interface TimedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _requestTime?: number;
}

type WindowIdPayload = {
  windowId?: number | string;
};

const resolvePayloadWindowId = (value: unknown): number | null => {
  if (typeof value !== 'object' || value === null || !('windowId' in value)) {
    return null;
  }

  const windowId = Number((value as WindowIdPayload).windowId);
  return windowId || null;
};

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private readonly baseUrl: string;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseURL || '';

    // 创建 axios 实例

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': `${app.getName()}/${app.getVersion()} (${process.platform})`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // 配置 HTTPS agent
      httpsAgent: new https.Agent({
        rejectUnauthorized: true, // 生产环境中设为 true
      }),
      // 配置代理
      ...(options.proxy && {
        httpsAgent: new HttpsProxyAgent(
          `http://${options.proxy.auth ? `${options.proxy.auth.username}:${options.proxy.auth.password}@` : ''}${options.proxy.host}:${options.proxy.port}`,
        ),
      }),
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleError.bind(this),
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleError.bind(this),
    );
  }

  /**
   * 处理请求
   */
  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const windowId = this.resolveWindowId(config);
    if (windowId && !(config as CChatAxiosRequestConfig).skipAuth) {
      const accessToken = storeTableClass.getAccessToken(windowId);
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      } else {
        delete config.headers.Authorization;
      }
    }

    const data: unknown = config.data;
    console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params as unknown,
      data: data ? (typeof data === 'string' ? '<<binary>>' : data) : undefined,
      // headers: config.headers,
    });

    // 添加请求时间戳
    (config as TimedAxiosRequestConfig)._requestTime = Date.now();

    return config;
  }

  private resolveWindowId(config: AxiosRequestConfig): number | null {
    const explicitWindowId = Number((config as CChatAxiosRequestConfig).windowId);
    if (explicitWindowId) {
      return explicitWindowId;
    }

    const paramsWindowId = resolvePayloadWindowId(config.params);
    if (paramsWindowId) {
      return paramsWindowId;
    }

    const contextWindowId = getActionCtx()?.windowId;
    if (contextWindowId) {
      return contextWindowId;
    }

    const data: unknown = config.data;
    if (!data) {
      return null;
    }

    if (
      typeof data === 'object' &&
      (typeof FormData === 'undefined' || !(data instanceof FormData))
    ) {
      return resolvePayloadWindowId(data);
    }

    if (typeof data === 'string') {
      try {
        const parsed: unknown = JSON.parse(data);
        return resolvePayloadWindowId(parsed);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * 处理响应
   */
  private handleResponse(response: AxiosResponse): AxiosResponse {
    const requestTime =
      Date.now() - ((response.config as TimedAxiosRequestConfig)._requestTime ?? 0);
    const data: unknown = response.data;

    console.log(
      `[HTTP Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} - ${requestTime}ms`,
      {
        status: response.status,
        data,
      },
    );

    return response;
  }

  /**
   * 处理错误
   */
  private handleError(error: AxiosError<{ code: number; message: string }>) {
    if (error.response) {
      // 服务器返回错误状态码
      console.error(`[HTTP] Error ${error.response.status}: ${error.response.config.url}`, {
        status: error.response.status,
        data: error.response.data,
        // headers: error.response.headers,
      });
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('[HTTP] Request Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
      });
    } else {
      // 其他错误
      console.error('[HTTP] General Error:', error.message);
    }
    /**  处理错误toast提示 */
    try {
      const windowId = this.resolveWindowId(error.response?.config ?? {});
      if (windowId) {
        /** 处理错误toast提示 */
        WindowManager.showToast(
          windowId,
          'error',
          error.response?.data?.message ?? error.message ?? '未知错误，请联系管理员',
        );
      }
    } catch (err) {
      console.log('处理错误toast提示失败', err);
    }

    return Promise.reject(error);
  }

  /**
   * GET 请求
   */
  public async get<T = any>(
    url: string,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.get<API.ApiResponse<T>>(url, config);
  }

  /**
   * POST 请求
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.post<API.ApiResponse<T>>(url, data, config);
  }

  /**
   * PUT 请求
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.put<API.ApiResponse<T>>(url, data, config);
  }

  /**
   * DELETE 请求
   */
  public async delete<T = any>(
    url: string,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.delete<API.ApiResponse<T>>(url, config);
  }

  /**
   * PATCH 请求
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.patch<API.ApiResponse<T>>(url, data, config);
  }

  /**
   * 上传文件
   */
  public async uploadFile<T = any>(
    url: string,
    formData: FormData,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    const defaultConfig: CChatAxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    };

    return this.axiosInstance.post<API.ApiResponse<T>>(url, formData, defaultConfig);
  }

  /**
   * 下载文件
   */
  public async downloadFile(
    url: string,
    destinationPath: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const fs = await import('fs');
    // const path = await import('path');

    const response = await this.axiosInstance<IncomingMessage>({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });

    const totalLength = parseInt(String(response.headers['content-length']), 10);
    let downloadedLength = 0;

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destinationPath);

      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        if (onProgress && totalLength) {
          const progress = (downloadedLength / totalLength) * 100;
          onProgress(Math.round(progress));
        }
      });

      response.data.pipe(writer);

      writer.on('finish', () => {
        console.log(`[HTTP] File downloaded successfully to: ${destinationPath}`);
        resolve();
      });

      writer.on('error', (err) => {
        console.error('[HTTP] Download error:', err);
        reject(err);
      });
    });
  }

  /**
   * 设置认证头
   */
  public setAuthHeader(token?: string): void {
    if (token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return;
    }

    console.warn('[HttpClient] setAuthHeader is deprecated. Token is resolved per request.');
  }

  /**
   * 清除认证头
   */
  public clearAuthHeader(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * 设置请求头
   */
  public setHeader(name: string, value: string): void {
    this.axiosInstance.defaults.headers.common[name] = value;
  }

  /**
   * 获取 axios 实例（用于高级配置）
   */
  public getInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}
