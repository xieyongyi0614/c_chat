import { HttpClient, type HttpClientOptions } from './http/httpClient';
import { AuthService, UploadService } from './services';

export type CreateApiClientOptions = HttpClientOptions;

export interface ApiClientBundle {
  http: HttpClient;
  auth: AuthService;
  upload: UploadService;
}

/**
 * 平台 bootstrap 调用入口：注入 4 个 adapter + baseURL，拿到 http + 业务 service。
 * 每个端各自维护单例，不在共享包里搞静态状态。
 */
export function createApiClient(options: CreateApiClientOptions): ApiClientBundle {
  const http = new HttpClient(options);
  return {
    http,
    auth: new AuthService(http),
    upload: new UploadService(http),
  };
}
