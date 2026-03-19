import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios/service/apiService';
import { addActionHandler } from '../util';

/** 登录 */
addActionHandler('SignIn', async (params) => {
  const res = await ApiClient.auth.signIn(params);
  if (!res.access_token) {
    console.log('SingIn failed');
    throw new Error('登录失败,不存在token');
  }
  storeTableClass.setAccessToken(res.access_token, 1);
  const userInfo = await ApiClient.auth.getUserInfo();
  return userInfo;
});

/** 注册 */
addActionHandler('SignUp', (params) => {
  return ApiClient.auth.signUp(params);
});

/** 获取用户信息 */
addActionHandler('GetUserInfo', () => {
  return ApiClient.auth.getUserInfo();
});
