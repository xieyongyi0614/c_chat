import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';
import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios/service/apiService';
import { addActionHandler, omitActionCtx } from '../util';
import { socketService } from '@c_chat/electron_client/utils/socket-io-client';

/** 登录 */
addActionHandler('SignIn', async (params) => {
  const res = await ApiClient.auth.signIn(omitActionCtx(params));
  if (!res?.access_token) {
    throw new Error('登录失败,不存在token');
  }
  storeTableClass.setAccessToken(res.access_token, params.windowId);
  ApiClient.instance.setAuthHeader(res.access_token);
  const userInfo = await ApiClient.auth.getUserInfo();
  if (userInfo) {
    MainWindowManager.getInstance().applyAuthState(true);
  }
  return userInfo;
});

addActionHandler('AutoSignIn', async (params) => {
  const { windowId } = params;
  const accessToken = storeTableClass.getAccessToken(windowId);
  if (!accessToken) {
    throw new Error(`自动登录失败,不存在窗口${windowId}token`);
  }
  const userInfo = await ApiClient.auth.getUserInfo();
  if (userInfo) {
    MainWindowManager.getInstance().applyAuthState(true);
  }

  const mainWindow = MainWindowManager.getInstance().getWindow();
  if (!mainWindow) {
    return;
  }

  socketService.init(mainWindow, accessToken);
  // const [err, res] = await to();

  // if (err) {
  //   console.log('登录失败',err);
  //   return;
  // }
  // return userInfo;
});

/** 注册 */
addActionHandler('SignUp', (params) => {
  return ApiClient.auth.signUp(params);
});

/** 获取用户信息 */
addActionHandler('GetUserInfo', () => {
  return ApiClient.auth.getUserInfo();
});
