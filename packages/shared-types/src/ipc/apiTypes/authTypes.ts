export interface PostSignInParams {
  email: string;
  password: string;
}
export interface PostSignInResponse {
  access_token: string;
  user: { id: string; email: string; username: string; role: number };
}

export interface PostSignUpParams {
  email: string;
  password: string;
}
export interface PostSignUpResponse {
  access_token: string;
  user: { id: string; email: string; username: string; role: number };
}
