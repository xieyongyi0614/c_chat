import {
  PostSignInParams,
  PostSignInResponse,
  PostSignUpParams,
  PostSignUpResponse,
} from './apiTypes';
import { IpcCallMethod, IpcMethod } from './ipcTypes';

export interface AuthPreloadTypes {
  [IpcCallMethod.SignIn]: IpcMethod<PostSignInParams, PostSignInResponse>;
  [IpcCallMethod.SignUp]: IpcMethod<PostSignUpParams, PostSignUpResponse>;
}
