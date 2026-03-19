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
