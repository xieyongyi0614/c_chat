import { HttpClient } from '../httpClient';
import { AuthService } from './authService';
import { UploadService } from './uploadService';

export class ApiClient {
  public static instance: HttpClient;
  public static auth: AuthService;
  public static upload: UploadService;

  constructor() {}

  public static init(baseURL: string = 'http://localhost:3001/api') {
    if (!ApiClient.instance) {
      this.instance = new HttpClient({
        baseURL,
        timeout: 15000,
        headers: {
          'X-Requested-With': 'Electron-Client',
          'Content-Type': 'application/json',
        },
      });

      // 初始化各个服务
      this.auth = new AuthService(ApiClient.instance);
      this.upload = new UploadService(ApiClient.instance);
    }
  }
}
