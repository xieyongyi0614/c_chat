// apps/electron_client/src/main/services/auth-service.ts
import { BaseService } from './baseService';
import { HttpClient } from '../httpClient';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: { id: string; email: string; username: string; role: number };
}

export class AuthService extends BaseService {
  constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  /**
   * 用户登录
   */
  public async login(credentials: LoginCredentials) {
    try {
      const response = await this.httpClient.post<API.ApiResponse<AuthResponse>>(
        '/auth/login',
        credentials,
      );
      return response.data.data;
    } catch (error: any) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  //TODO 未对接
  /**
   * 用户注册
   */
  public async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.httpClient.post<AuthResponse>('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  /**
   * 刷新令牌
   */
  public async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await this.httpClient.post<AuthResponse>('/auth/refresh', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      throw error;
    }
  }

  /**
   * 验证令牌
   */
  public async verifyToken(token: string): Promise<boolean> {
    try {
      await this.httpClient.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error) {
      console.error('验证令牌失败:', error);
      return false;
    }
  }

  /**
   * 退出登录
   */
  public async logout(): Promise<void> {
    try {
      await this.httpClient.post('/auth/logout');
      this.clearAuthToken();
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使失败也要清除本地令牌
      this.clearAuthToken();
    }
  }

  /**
   * 获取当前用户信息
   */
  public async getCurrentUser(): Promise<User> {
    try {
      const response = await this.httpClient.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  public async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      const response = await this.httpClient.put<User>('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }
}
