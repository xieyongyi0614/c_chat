import { AuthTypes, UserTypes } from './apiTypes';
import { IpcMethod } from './ipcTypes';

export interface AuthPreloadTypes {
  SignIn: IpcMethod<AuthTypes.PostSignInParams, AuthTypes.GetUserInfoResponse | undefined>;
  SignUp: IpcMethod<AuthTypes.PostSignUpParams, AuthTypes.PostSignUpResponse | undefined>;
  GetUserInfo: () => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  AutoSignIn: () => Promise<void>;
  GetUserList: IpcMethod<UserTypes.GetUserListParams, any | undefined>;
}
