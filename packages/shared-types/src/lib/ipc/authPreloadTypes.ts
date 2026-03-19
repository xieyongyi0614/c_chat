import { AuthTypes } from './apiTypes';
import { IpcMethod } from './ipcTypes';

export interface AuthPreloadTypes {
  SignIn: IpcMethod<AuthTypes.PostSignInParams, AuthTypes.GetUserInfoResponse>;
  SignUp: IpcMethod<AuthTypes.PostSignUpParams, AuthTypes.PostSignUpResponse>;
  GetUserInfo: IpcMethod<undefined, AuthTypes.GetUserInfoResponse>;
}
