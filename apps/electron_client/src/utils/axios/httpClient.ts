import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { app } from 'electron';
import { safeJsonStringify } from '@c_chat/shared-utils';
import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';

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
    console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
        ? typeof config.data === 'string'
          ? '<<binary>>'
          : config.data
        : undefined,
      headers: config.headers,
    });

    // 添加请求时间戳
    (config as any)._requestTime = Date.now();

    return config;
  }

  /**
   * 处理响应
   */
  private handleResponse(response: AxiosResponse): AxiosResponse {
    const requestTime = Date.now() - (response.config as any)._requestTime;

    console.log(
      `[HTTP] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} - ${requestTime}ms`,
      {
        status: response.status,
        data: response.data,
      },
    );

    return response;
  }

  /**
   * 处理错误
   */
  private handleError(error: any): Promise<any> {
    if (error.response) {
      // 服务器返回错误状态码
      console.error(`[HTTP] Error ${error.response.status}: ${error.response.config.url}`, {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
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
    /** 处理错误toast提示 */
    if (error.response.status === 401) {
      MainWindowManager.sendWebContentEvent(
        ELECTRON_TO_CLIENT_CHANNELS.TOAST,
        'error',
        '登录已过期，请重新登录！',
      );
    } else {
      MainWindowManager.sendWebContentEvent(
        ELECTRON_TO_CLIENT_CHANNELS.TOAST,
        'error',
        error.message,
      );
    }

    return Promise.reject(error);
  }

  /**
   * GET 请求
   */
  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.get<API.ApiResponse<T>>(url, config);
  }

  /**
   * POST 请求
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.post<API.ApiResponse<T>>(url, data, config);
  }

  /**
   * PUT 请求
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.put<API.ApiResponse<T>>(url, data, config);
  }

  /**
   * DELETE 请求
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.delete<API.ApiResponse<T>>(url, config);
  }

  /**
   * PATCH 请求
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<API.ApiResponse<T>>> {
    return this.axiosInstance.patch<API.ApiResponse<T>>(url, data, config);
  }

  /**
   * 上传文件
   */
  public async uploadFile(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    const defaultConfig: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    };

    return this.axiosInstance.post(url, formData, defaultConfig);
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
    const path = await import('path');

    const response = await this.axiosInstance({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });

    const totalLength = parseInt(response.headers['content-length'], 10);
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
  public setAuthHeader(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
