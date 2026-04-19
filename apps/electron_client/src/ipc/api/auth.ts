import { WindowManager } from '@c_chat/electron_client/main/windows';
import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios/service/apiService';
import logger from '../../utils/logger';
import { addActionHandler, omitActionCtx } from '../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import { GetUserList } from '@c_chat/shared-protobuf';
import { SOCKET_PROTO_EVENT } from '@c_chat/shared-protobuf/protoMap';
import { to, transformPageParams, transformPagination } from '@c_chat/shared-utils';
import { UserTypes } from '@c_chat/shared-types';

/** 登录 */
addActionHandler('SignIn', async (params) => {
  // 使用 WindowManager 获取或创建窗口
  const window = WindowManager.getInstance().getWindow(params.windowId);
  if (!window) {
    throw new Error(`窗口${params.windowId}不存在`);
  }
  const res = await ApiClient.auth.signIn(omitActionCtx(params));
  if (!res?.access_token) {
    throw new Error('登录失败,不存在token');
  }
  storeTableClass.setAccessToken(res.access_token, params.windowId);
  // 为该窗口初始化独立的 socket 连接
  await socketManager.initSocket(params.windowId, window);

  // 更新窗口的认证状态
  if (res.access_token) {
    WindowManager.getInstance().applyWindowAuthState(params.windowId, true);
  }
});

/** 自动登录 - 检查token并初始化socket连接 */
addActionHandler('AutoSignIn', async (params) => {
  const window = WindowManager.getInstance().getWindow(params.windowId);
  if (!window) {
    throw new Error(`窗口${params.windowId}不存在`);
  }

  // 先检查token是否存在
  const accessToken = storeTableClass.getAccessToken(params.windowId);
  if (!accessToken) {
    // 没有token，不初始化socket
    logger.info(`[AutoSignIn] 窗口${params.windowId}没有token，跳过socket初始化`);
    throw new Error('窗口没有token，请重新登录');
  }

  socketManager.initSocket(params.windowId, window);
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
  const newPageParams = transformPageParams(data.pagination);

  const params = { pagination: newPageParams, word: data.word };
  console.log(params, 'params');
  const socketService = socketManager.getSocketService(data.windowId);
  const [, res] = await to(
    socketService.genericRequest(
      SOCKET_PROTO_EVENT.getUserList,
      GetUserList.encode(GetUserList.create(params)).finish(),
    ),
  );
  const result = {
    list: (res?.list ?? []) as UserTypes.UserListItem[],
    pagination: transformPagination(res?.pagination),
  };

  return result;
});
