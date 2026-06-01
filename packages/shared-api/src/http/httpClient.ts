import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse } from '@c_chat/shared-types';
import type {
  ClientInfo,
  ErrorReporter,
  RequestContext,
  RequestContextResolver,
  TokenProvider,
} from '../adapters';
import { CChatAxiosRequestConfig } from './types';

export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  clientInfo: ClientInfo;
  tokenProvider: TokenProvider;
  errorReporter?: ErrorReporter;
  contextResolver?: RequestContextResolver;
  /**
   * 平台特定的 axios 选项（如 electron 的 httpsAgent / HttpsProxyAgent）。
   * 这里传进来的字段会浅合并到 axios.create 配置里。
   */
  axiosOverrides?: AxiosRequestConfig;
}

interface TimedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _requestTime?: number;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private readonly tokenProvider: TokenProvider;
  private readonly errorReporter?: ErrorReporter;
  private readonly contextResolver?: RequestContextResolver;
  private readonly clientInfo: ClientInfo;

  constructor(options: HttpClientOptions) {
    this.tokenProvider = options.tokenProvider;
    this.errorReporter = options.errorReporter;
    this.contextResolver = options.contextResolver;
    this.clientInfo = options.clientInfo;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.clientInfo.platform === 'browser') {
      delete headers['User-Agent'];
    } else if (!headers['User-Agent']) {
      headers['User-Agent'] =
        `${this.clientInfo.name}/${this.clientInfo.version} (${this.clientInfo.platform})`;
    }

    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 10000,
      headers,
      ...options.axiosOverrides,
    });

    this.axiosInstance.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleError.bind(this),
    );

    this.axiosInstance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleError.bind(this),
    );
  }

  private resolveContext(config: AxiosRequestConfig): RequestContext | null {
    const explicit = (config as CChatAxiosRequestConfig).ctx;
    if (explicit) return explicit;
    return this.contextResolver?.resolve(config) ?? null;
  }

  private async handleRequest(
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> {
    const cfg = config as InternalAxiosRequestConfig & CChatAxiosRequestConfig;
    const ctx = this.resolveContext(config);

    if (!cfg.skipAuth) {
      const token = await this.tokenProvider.getToken(ctx);
      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      } else {
        delete cfg.headers.Authorization;
      }
    }

    const data: unknown = cfg.data;
    console.log(`[HTTP Request] ${cfg.method?.toUpperCase()} ${cfg.url}`, {
      params: cfg.params as unknown,
      data: data ? (typeof data === 'string' ? '<<binary>>' : data) : undefined,
    });

    (cfg as TimedAxiosRequestConfig)._requestTime = Date.now();

    return cfg;
  }

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

  private handleError = (error: AxiosError<{ code: number; message: string }>) => {
    if (error.response) {
      console.error(`[HTTP] Error ${error.response.status}: ${error.response.config.url}`, {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('[HTTP] Request Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
      });
    } else {
      console.error('[HTTP] General Error:', error.message);
    }

    if (this.errorReporter) {
      try {
        const ctx = this.resolveContext(error.response?.config ?? error.config ?? {});
        const message = error.response?.data?.message ?? error.message ?? '未知错误，请联系管理员';
        this.errorReporter.report({ error, message, ctx });
      } catch (reportErr) {
        console.warn('[HTTP] ErrorReporter failed:', reportErr);
      }
    }

    return Promise.reject(error);
  };

  public get<T = unknown>(
    url: string,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.get<ApiResponse<T>>(url, config);
  }

  public post<T = unknown>(
    url: string,
    data?: unknown,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.post<ApiResponse<T>>(url, data, config);
  }

  public put<T = unknown>(
    url: string,
    data?: unknown,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.put<ApiResponse<T>>(url, data, config);
  }

  public delete<T = unknown>(
    url: string,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.delete<ApiResponse<T>>(url, config);
  }

  public patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
  }

  /**
   * multipart/form-data 上传。浏览器、Node、React Native 都内置 FormData。
   * 平台特定的"按路径读文件再分片"逻辑请放在外层 helper 里（参见 electron 端 fileOps）。
   */
  public uploadFile<T = unknown>(
    url: string,
    formData: FormData,
    config?: CChatAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    const defaultConfig: CChatAxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    };

    return this.axiosInstance.post<ApiResponse<T>>(url, formData, defaultConfig);
  }

  public setAuthHeader(token?: string): void {
    if (token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return;
    }
    console.warn(
      '[HttpClient] setAuthHeader without token is deprecated; token is resolved per-request.',
    );
  }

  public clearAuthHeader(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  public setHeader(name: string, value: string): void {
    this.axiosInstance.defaults.headers.common[name] = value;
  }

  /** 暴露原生 axios 实例，供平台层做高级用法（如 electron 的 stream 下载）。 */
  public getInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}
