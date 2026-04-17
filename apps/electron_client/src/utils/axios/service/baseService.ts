import { to } from '@c_chat/shared-utils';
import { HttpClient } from '../httpClient';

export abstract class BaseService {
  protected httpClient: HttpClient;
  public apiTool = to;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /***
   * 设置认证令牌
   */
  protected setAuthToken(token: string): void {
    this.httpClient.setAuthHeader(token);
  }

  /**
   * 清除认证令牌
   */
  protected clearAuthToken(): void {
    this.httpClient.clearAuthHeader();
  }
}
