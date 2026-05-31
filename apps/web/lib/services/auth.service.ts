import { authService as sharedAuthService, getRealtimeClient, initRealtimeClient, destroyRealtimeClient } from '../api/client';
import { StoreDB, ConversationDB, MessageDB, UploadTaskDB } from '../db';
import type {
  GetUserListParams,
  AuthTypes,
  SocketTypes,
  UserTypes,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { GetUserList } from '@c_chat/shared-protobuf';

export class AuthService {
  async signIn(params: AuthTypes.PostSignInParams): Promise<void> {
    const { access_token: accessToken } = await sharedAuthService.signIn(params);
    const userInfo = await sharedAuthService.getUserInfo();

    if (!userInfo) {
      throw new Error('Failed to get user info');
    }

    await StoreDB.set('accessToken', accessToken);
    await StoreDB.set('userInfo', JSON.stringify(userInfo));
    await initRealtimeClient();
  }

  async signUp(params: AuthTypes.PostSignUpParams): Promise<void> {
    const { access_token: accessToken } = await sharedAuthService.signUp(params);
    const userInfo = await sharedAuthService.getUserInfo();

    if (!userInfo) {
      throw new Error('Failed to get user info');
    }

    await StoreDB.set('accessToken', accessToken);
    await StoreDB.set('userInfo', JSON.stringify(userInfo));
    await initRealtimeClient();
  }

  async getUserInfo(): Promise<AuthTypes.GetUserInfoResponse> {
    const userInfo = await sharedAuthService.getUserInfo();
    if (!userInfo) {
      throw new Error('Failed to get user info');
    }
    await StoreDB.set('userInfo', JSON.stringify(userInfo));
    return userInfo;
  }

  async updateUserProfile(params: AuthTypes.UpdateUserProfileParams): Promise<void> {
    const updated = await sharedAuthService.updateUserProfile(params);
    if (!updated) return;
    await StoreDB.set('userInfo', JSON.stringify(updated));
  }

  async autoSignIn(): Promise<void> {
    const token = await StoreDB.get('accessToken');
    const userInfoStr = await StoreDB.get('userInfo');

    if (!token || !userInfoStr) {
      throw new Error('No saved credentials');
    }

    await initRealtimeClient();
  }

  async logout(): Promise<void> {
    destroyRealtimeClient();

    await StoreDB.delete('accessToken');
    await StoreDB.delete('userInfo');
    await ConversationDB.clear();
    await MessageDB.clear();
    await UploadTaskDB.clear();
  }

  async getUserList(
    params: GetUserListParams,
  ): Promise<SocketTypes.ResponseList<UserTypes.UserListItem>> {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      throw new Error('RealtimeClient not initialized');
    }

    const request = GetUserList.create({
      pagination: params.pagination,
      word: params.word,
    });

    const payload = GetUserList.encode(request).finish();
    const response = await realtimeClient.genericRequest(
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
