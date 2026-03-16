import { IpcCallMethod } from '@c_chat/shared-types';
import { ApiClient } from '../../utils/axios/service/apiService';
import { addActionHandler } from '../util';

/** 登录 */
addActionHandler(IpcCallMethod.SignIn, async (params) => {
  const res = await ApiClient.auth.signIn(params);
  console.log(res, 'signIn addActionHandler');
  return res;
});
/** 注册 */
addActionHandler(IpcCallMethod.SignUp, async (params) => {
  const res = await ApiClient.auth.signUp(params);
  console.log(res, 'signUp');
  return res;
});
