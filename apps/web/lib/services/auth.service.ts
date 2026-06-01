import {
  authService as sharedAuthService,
  getRealtimeClient,
  initRealtimeClient,
  destroyRealtimeClient,
} from '../api/client';
import { StoreDB, ConversationDB, MessageDB, UploadTaskDB } from '../db';
import { AuthSessionStorage, type AuthSession } from './authSession.storage';
import type { GetUserListParams, AuthTypes, SocketTypes, UserTypes } from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { GetUserList } from '@c_chat/shared-protobuf';

export class AuthService {
  async signIn(params: AuthTypes.PostSignInParams): Promise<AuthTypes.GetUserInfoResponse> {
    const { access_token: accessToken } = await sharedAuthService.signIn(params);
    await this.saveSession({ accessToken, userInfo: null });

    const userInfo = await this.getUserInfo();

    await initRealtimeClient();

    return userInfo;
  }

  async signUp(params: AuthTypes.PostSignUpParams): Promise<AuthTypes.GetUserInfoResponse> {
    const { access_token: accessToken } = await sharedAuthService.signUp(params);
    await this.saveSession({ accessToken, userInfo: null });

    const userInfo = await sharedAuthService.getUserInfo();

    if (!userInfo) {
      throw new Error('Failed to get user info');
    }

    await this.saveSession({ accessToken, userInfo });
    await initRealtimeClient();

    return userInfo;
  }

  async getUserInfo(): Promise<AuthTypes.GetUserInfoResponse> {
    const userInfo = await sharedAuthService.getUserInfo();
    if (!userInfo) {
      throw new Error('Failed to get user info');
    }
    const session = await this.getSession();
    if (session) {
      await this.saveSession({ ...session, userInfo });
    }
    return userInfo;
  }

  async updateUserProfile(params: AuthTypes.UpdateUserProfileParams): Promise<void> {
    const updated = await sharedAuthService.updateUserProfile(params);
    if (!updated) return;
    const session = await this.getSession();
    if (session) {
      await this.saveSession({ ...session, userInfo: updated });
    }
  }

  async autoSignIn(): Promise<AuthTypes.GetUserInfoResponse> {
    const session = await this.getSession();

    if (!session) {
      throw new Error('No saved credentials');
    }

    const userInfo = session.userInfo ?? (await this.getUserInfo());
    await initRealtimeClient();

    return userInfo;
  }

  async logout(): Promise<void> {
    destroyRealtimeClient();

    await this.clearSession();
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
    const response = await realtimeClient.genericRequest(ClientToServiceEvent.getUserList, payload);

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

  private async getSession(): Promise<AuthSession | null> {
    const session = AuthSessionStorage.get();

    if (session) {
      return session;
    }

    const legacyToken = await StoreDB.get<string>('accessToken');
    if (!legacyToken) {
      return null;
    }

    const legacyUserInfo = await StoreDB.get<string>('userInfo');
    const migratedSession: AuthSession = {
      accessToken: legacyToken,
      userInfo: legacyUserInfo ? (JSON.parse(legacyUserInfo) as AuthTypes.GetUserInfoResponse) : null,
    };

    await this.saveSession(migratedSession);
    await StoreDB.delete('accessToken');
    await StoreDB.delete('userInfo');

    return migratedSession;
  }

  private async saveSession(session: AuthSession): Promise<void> {
    AuthSessionStorage.set(session);
  }

  private async clearSession(): Promise<void> {
    AuthSessionStorage.clear();
    await StoreDB.delete('accessToken');
    await StoreDB.delete('userInfo');
  }
}

export const authService = new AuthService();
