import type { AuthTypes } from '@c_chat/shared-types';
import { BaseService } from './baseService';

export class AuthService extends BaseService {
  /** 用户登录 */
  public async signIn(params: AuthTypes.PostSignInParams) {
    const [err, response] = await this.apiTool(
      this.httpClient.post<AuthTypes.PostSignInResponse>('/auth/sign-in', params, {
        skipAuth: true,
      }),
    );
    if (err) {
      console.error('登录失败:', err.message);
      return;
    }
    return response.data.data;
  }

  /** 用户注册 */
  public async signUp(params: AuthTypes.PostSignUpParams) {
    const [err, response] = await this.apiTool(
      this.httpClient.post<AuthTypes.PostSignUpResponse>('/auth/sign-up', params, {
        skipAuth: true,
      }),
    );
    if (err) {
      console.error('注册失败:', err.message);
      return;
    }
    return response.data.data;
  }

  /** 获取当前用户信息 */
  public async getUserInfo() {
    const [err, response] = await this.apiTool(
      this.httpClient.get<AuthTypes.GetUserInfoResponse>('/users/userInfo'),
    );
    if (err) {
      console.error('获取用户信息失败:', err.message);
      return;
    }
    return response.data.data;
  }

  /** 更新用户资料 */
  public async updateUserProfile(params: AuthTypes.UpdateUserProfileParams) {
    const [err, response] = await this.apiTool(
      this.httpClient.patch<AuthTypes.GetUserInfoResponse>('/users/profile', {
        nickname: params.nickname,
        avatarUrl: params.avatarUrl,
      }),
    );
    if (err) {
      console.error('更新用户信息失败:', err.message);
      return;
    }
    return response.data.data;
  }
}
