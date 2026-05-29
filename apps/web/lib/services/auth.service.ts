import { httpService } from './http.service';
import { socketService } from './socket.service';
import { StoreDB, ConversationDB, MessageDB } from '../db';
import type {
  PostSignInParams,
  PostSignUpParams,
  GetUserInfoResponse,
  UpdateUserProfileParams,
  GetUserListParams,
  GetUserListResponse,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { GetUserList, UserInfo } from '@c_chat/shared-protobuf';

export class AuthService {
  async signIn(params: PostSignInParams): Promise<void> {
    const response = await httpService.post<{ data: { accessToken: string; userInfo: GetUserInfoResponse } }>('/auth/signin', params);

    const { accessToken, userInfo } = response.data;

    await StoreDB.set('accessToken', accessToken);
    await StoreDB.set('userInfo', JSON.stringify(userInfo));

    await socketService.connect(accessToken, userInfo.id);
  }

  async signUp(params: PostSignUpParams): Promise<void> {
    const response = await httpService.post<{ data: { accessToken: string; userInfo: GetUserInfoResponse } }>('/auth/signup', params);

    const { accessToken, userInfo } = response.data;

    await StoreDB.set('accessToken', accessToken);
    await StoreDB.set('userInfo', JSON.stringify(userInfo));

    await socketService.connect(accessToken, userInfo.id);
  }

  async getUserInfo(): Promise<GetUserInfoResponse> {
    const userInfoStr = await StoreDB.get('userInfo');
    if (userInfoStr) {
      return JSON.parse(userInfoStr);
    }

    const userInfo = await socketService.request<UserInfo>(
      ClientToServiceEvent.getUserInfo,
      null
    );

    const result: GetUserInfoResponse = {
      id: userInfo.id,
      email: userInfo.email,
      nickname: userInfo.nickname || '',
      avatarUrl: userInfo.avatarUrl || '',
      state: 0,
    };

    await StoreDB.set('userInfo', JSON.stringify(result));
    return result;
  }

  async updateUserProfile(params: UpdateUserProfileParams): Promise<void> {
    await httpService.put('/user/profile', params);

    const userInfo = await this.getUserInfo();
    const updated = { ...userInfo, ...params };
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

  async getUserList(params: GetUserListParams): Promise<GetUserListResponse> {
    const request = GetUserList.create({
      pageSize: params.pageSize || 20,
      keyword: params.keyword || '',
    });

    const payload = GetUserList.encode(request).finish();
    const response = await socketService.request(
      ClientToServiceEvent.getUserList,
      payload
    );

    return {
      list: response.list.map((user: any) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        nickname: user.nickname || '',
        avatarUrl: user.avatarUrl || '',
        phone: user.phone || '',
        gender: user.gender || 0,
      })),
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
    };
  }
}

export const authService = new AuthService();
