import { apiClient } from './http.service';
import { socketService } from './socket.service';
import { StoreDB, ConversationDB, MessageDB } from '../db';
import type {
  GetUserListParams,
  AuthTypes,
  SocketTypes,
  UserTypes,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { GetUserList, GetUserListResponse } from '@c_chat/shared-protobuf';

export class AuthService {
  async signIn(params: AuthTypes.PostSignInParams): Promise<void> {
    const { access_token: accessToken } = await apiClient.auth.signIn(params);
    const userInfo = await apiClient.auth.getUserInfo();

    if (!userInfo) {
      throw new Error('Failed to get user info');
    }

    await StoreDB.set('accessToken', accessToken);
    await StoreDB.set('userInfo', JSON.stringify(userInfo));
    await socketService.connect(accessToken, userInfo.id);
  }

  async signUp(params: AuthTypes.PostSignUpParams): Promise<void> {
    const { access_token: accessToken } = await apiClient.auth.signUp(params);
    const userInfo = await apiClient.auth.getUserInfo();

    if (!userInfo) {
      throw new Error('Failed to get user info');
    }

    await StoreDB.set('accessToken', accessToken);
    await StoreDB.set('userInfo', JSON.stringify(userInfo));
    await socketService.connect(accessToken, userInfo.id);
  }

  async getUserInfo(): Promise<AuthTypes.GetUserInfoResponse> {
    const userInfo = await apiClient.auth.getUserInfo();
    if (!userInfo) {
      throw new Error('Failed to get user info');
    }
    await StoreDB.set('userInfo', JSON.stringify(userInfo));
    return userInfo;
  }

  async updateUserProfile(params: AuthTypes.UpdateUserProfileParams): Promise<void> {
    const updated = await apiClient.auth.updateUserProfile(params);
    if (!updated) return;
    await StoreDB.set('userInfo', JSON.stringify(updated));
  }

  async autoSignIn(): Promise<void> {
    const token = await StoreDB.get('accessToken');
    const userInfoStr = await StoreDB.get('userInfo');

    if (!token || !userInfoStr) {
      throw new Error('No saved credentials');
    }

    const userInfo = JSON.parse(userInfoStr);
    await socketService.connect(token, userInfo.id);
  }

  async logout(): Promise<void> {
    socketService.disconnect();

    await StoreDB.delete('accessToken');
    await StoreDB.delete('userInfo');
    await ConversationDB.clear();
    await MessageDB.clear();
  }

  async getUserList(
    params: GetUserListParams,
  ): Promise<SocketTypes.ResponseList<UserTypes.UserListItem>> {
    const request = GetUserList.create({
      pagination: params.pagination,
      word: params.word,
    });

    const payload = GetUserList.encode(request).finish();
    const response = await socketService.request<GetUserListResponse>(
      ClientToServiceEvent.getUserList,
      payload
    );

    return {
      list: response.list.map((user) => ({
        id: user.id || '',
        email: user.email || '',
        nickname: user.nickname || '',
        avatarUrl: user.avatarUrl || '',
        state: user.state || 0,
        updateTime: Number(user.updateTime || 0),
      })),
      pagination: {
        total: response.pagination?.total || 0,
        totalPage: response.pagination?.totalPage || 0,
        page: response.pagination?.page || 1,
        pageSize: response.pagination?.pageSize || 20,
      },
    };
  }
}

export const authService = new AuthService();
