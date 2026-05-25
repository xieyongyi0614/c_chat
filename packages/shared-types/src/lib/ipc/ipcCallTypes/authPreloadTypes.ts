import type { AuthTypes, UserTypes } from '../apiTypes';
import type { IpcMethod } from '../ipcTypes';
import type { SocketTypes } from '../../socket.types';

export type GetUserListParams = SocketTypes.RequestListParams;
export interface AuthPreloadTypes {
  SignIn: IpcMethod<AuthTypes.PostSignInParams, void>;
  SignUp: IpcMethod<AuthTypes.PostSignUpParams, void>;
  GetUserInfo: () => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  UpdateUserProfile: IpcMethod<
    AuthTypes.UpdateUserProfileParams,
    AuthTypes.GetUserInfoResponse | undefined
  >;
  AutoSignIn: () => Promise<void>;
  Logout: () => Promise<void>;
  GetUserList: IpcMethod<GetUserListParams, SocketTypes.ResponseList<UserTypes.UserListItem>>;
}
