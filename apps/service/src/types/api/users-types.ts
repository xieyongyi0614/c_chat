import { User } from 'generated/prisma/browser';

export namespace UsersTypes {
  export interface AuthResponse {
    access_token: string;
    user: { id: string; email: string; username: string; role: number };
  }
  export type PrismaUser = User;
  export type UsersItem = Omit<PrismaUser, 'password'>;

  export enum UserRole {
    ADMIN = 0,
    USER = 1,
  }
  export enum UserStatus {
    INACTIVE = 0,
    ACTIVE = 1,
  }
  export interface GetAdminUsersParams extends API.RequestListParams {
    username?: string;
    email?: string;
  }

  export interface GetAdminUsersResponse {
    list: UsersItem[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface GetAdminUsersByIdParams {
    id: string;
  }

  export type GetAdminUsersByIdResponse = UsersItem;

  export interface PostAdminUsersParams {
    username: string;
    email: string;
    password: string;
  }

  export type PostAdminUsersResponse = UsersItem;

  export interface PutAdminUsersByIdParams {
    username?: string;
    email?: string;
    password?: string;
  }

  export type PutAdminUsersByIdResponse = UsersItem;

  export interface DeleteAdminUsersByIdResponse {
    success: boolean;
  }

  export interface PostAdminUsersRegisterParams {
    username: string;
    email: string;
    password: string;
  }

  export type PostAdminUsersRegisterResponse = AuthResponse;

  export interface PostAdminUsersLoginParams {
    email: string;
    password: string;
  }

  export type PostAdminUsersLoginResponse = AuthResponse;

  export type GetUserInfoResponse = Pick<
    UsersItem,
    'id' | 'email' | 'nickname' | 'avatarUrl' | 'state'
  >;

  export type UpdateUserProfileParams = Partial<Pick<UsersItem, 'nickname' | 'avatarUrl'>>;
}

export namespace AuthTypes {
  export interface JWTPayload {
    id: string;
    email: string;
  }
  export interface WsHandshakeAuth {
    token: string;
  }
}
