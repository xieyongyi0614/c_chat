import { SocketTypes } from '../../socket.types';
export namespace AuthTypes {
  export interface PostSignInParams {
    email: string;
    password: string;
  }
  export interface PostSignInResponse {
    access_token: string;
  }

  export interface PostSignUpParams {
    email: string;
    username: string;
    password: string;
    phone?: string;
    // 0-女, 1-男, 2-其他
    gender?: string;
  }
  export interface PostSignUpResponse {
    access_token: string;
  }

  export interface GetUserInfoResponse {
    id: string;
    email: string;
    nickname: string | null;
    avatar_url: string | null;
    state: number;
  }
}

export namespace UserTypes {
  export interface GetUserListParams extends SocketTypes.RequestPagination {
    word?: string;
  }
  export interface UserListItem {
    id: string;
    email: string;
    phone: string | null;
    nickname: string | null;
    avatar_url: string | null;
    gender: number;
    state: number;
    birthday: Date | null;
    signature: string | null;
    location: string | null;
    background_wall: string | null;
    update_time: Date;
    create_time: Date;
  }
}
