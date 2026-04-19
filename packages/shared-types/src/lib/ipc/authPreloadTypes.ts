import { AuthTypes, UserTypes } from './apiTypes';
import { IpcMethod } from './ipcTypes';
import { SocketTypes } from '../socket.types';

export type GetUserListParams = SocketTypes.RequestListParams;
export interface AuthPreloadTypes {
  SignIn: IpcMethod<AuthTypes.PostSignInParams, void>;
  SignUp: IpcMethod<AuthTypes.PostSignUpParams, AuthTypes.PostSignUpResponse | undefined>;
  GetUserInfo: () => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  AutoSignIn: () => Promise<void>;
  GetUserList: IpcMethod<GetUserListParams, SocketTypes.ResponseList<UserTypes.UserListItem>>;
}
