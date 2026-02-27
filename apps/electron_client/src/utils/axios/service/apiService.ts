import { HttpClient } from '../httpClient';
import { AuthService } from './authService';

export class ApiClient {
  public readonly httpClient: HttpClient;
  public readonly auth: AuthService;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.httpClient = new HttpClient({
      baseURL,
      timeout: 15000,
      headers: {
        'X-Requested-With': 'Electron-Client',
        'Content-Type': 'application/json',
      },
    });

    // 初始化各个服务
    this.auth = new AuthService(this.httpClient);
  }

  /**
   * 设置认证令牌
   */
  public setAuthToken(token: string): void {
    this.httpClient.setAuthHeader(token);
  }

  /**
   * 清除认证令牌
   */
  public clearAuthToken(): void {
    this.httpClient.clearAuthHeader();
  }

  /**
   * 设置请求头
   */
  public setHeader(name: string, value: string): void {
    this.httpClient.setHeader(name, value);
  }

  /**
   * 获取所有服务实例
   */
  public getAllServices() {
    return {
      auth: this.auth,
    };
  }
}
