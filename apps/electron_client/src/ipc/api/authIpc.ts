import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios';
import logger from '../../utils/logger';
import { addActionHandler } from '../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import { GetUserList } from '@c_chat/shared-protobuf';
import { to, transformPageParams, transformPagination } from '@c_chat/shared-utils';
import { UserTypes } from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { WindowManager } from '@c_chat/electron_client/main/windows';

const notifyWindowStateChange = () => {
  WindowManager.getInstance().notifyWindowStateChange();
};

/** 登录/注册成功后的统一收尾：落库 token、通知窗口、建立 socket */
const completeAuth = async (windowId: number, accessToken: string | undefined, action: string) => {
  if (!accessToken) {
    throw new Error(`${action}失败,不存在token`);
  }
  storeTableClass.setAccessToken(accessToken, windowId);
  notifyWindowStateChange();
  await socketManager.initSocket(windowId);
};

/** 登录 */
addActionHandler('SignIn', async (params) => {
  const res = await ApiClient.auth.signIn(params);
  await completeAuth(params.windowId, res?.access_token, '登录');
});

/** 注册 */
addActionHandler('SignUp', async (params) => {
  const res = await ApiClient.auth.signUp(params);
  await completeAuth(params.windowId, res?.access_token, '注册');
});

/** 自动登录 - 检查token并初始化socket连接 */
addActionHandler('AutoSignIn', async (params) => {
  const accessToken = storeTableClass.getAccessToken(params.windowId);
  if (!accessToken) {
    logger.info(`[AutoSignIn] 窗口${params.windowId}没有token，跳过socket初始化`);
    throw new Error('窗口没有token，请重新登录');
  }

  await socketManager.initSocket(params.windowId);
});

/** 退出登录 */
addActionHandler('Logout', async (params) => {
  socketManager.destroySocket(params.windowId);
  storeTableClass.clearAuthData(params.windowId);
  notifyWindowStateChange();
});

/** 获取用户信息 */
addActionHandler('GetUserInfo', () => {
  return ApiClient.auth.getUserInfo();
});

/** 更新用户信息 */
addActionHandler('UpdateUserProfile', async (params) => {
  const avatarUrl = params.avatarFilePath
    ? (await ApiClient.upload.uploadFileByPath(params.avatarFilePath)).url
    : params.avatarUrl;

  const userInfo = await ApiClient.auth.updateUserProfile({
    nickname: params.nickname,
    avatarUrl,
  });
  if (userInfo) {
    storeTableClass.setUserInfo(userInfo, params.windowId);
    notifyWindowStateChange();
  }
  return userInfo;
});

/** 获取用户列表 */
addActionHandler('GetUserList', async (data) => {
  const newPageParams = transformPageParams(data.pagination);

  const params = { pagination: newPageParams, word: data.word };
  console.log(params, 'params');
  const socketService = socketManager.getSocketService(data.windowId);
  const [, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.getUserList,
      GetUserList.encode(GetUserList.create(params)).finish(),
    ),
  );
  const result = {
    list: (res?.list ?? []) as UserTypes.UserListItem[],
    pagination: transformPagination(res?.pagination),
  };

  return result;
});
