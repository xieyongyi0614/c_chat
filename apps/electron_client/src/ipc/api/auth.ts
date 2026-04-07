import { MainWindowManager } from '@c_chat/electron_client/main/windows/mainWindow';
import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios/service/apiService';
import { addActionHandler, omitActionCtx } from '../util';
import { socketService } from '@c_chat/electron_client/utils/socket-io-client';
import { GetUserList } from '@c_chat/shared-protobuf';
import { SOCKET_PROTO_EVENT } from '@c_chat/shared-protobuf/protoMap';

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

addActionHandler('AutoSignIn', async () => {
  const mainWindow = MainWindowManager.getInstance().getWindow();
  if (!mainWindow) {
    return;
  }
  socketService.init(mainWindow);
});

/** 注册 */
addActionHandler('SignUp', (params) => {
  return ApiClient.auth.signUp(params);
});

/** 获取用户信息 */
addActionHandler('GetUserInfo', () => {
  return ApiClient.auth.getUserInfo();
});

/** 获取用户列表 */
addActionHandler('GetUserList', async (data) => {
  // socketService.sendMessageToService(
  //   SOCKET_PROTO_EVENT.getUserList,
  //   GetUserList.encode(
  //     GetUserList.create({ pagination: { page: 1, pageSize: 10 }, word: '' }),
  //   ).finish(),
  // );
  const params = { pagination: { page: 1, pageSize: 10 }, word: '' };
  console.log(params, 'params');
  return socketService.genericRequest(
    SOCKET_PROTO_EVENT.getUserList,
    GetUserList.encode(GetUserList.create(params)).finish(),
  );
});
