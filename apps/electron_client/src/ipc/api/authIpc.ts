import { storeTableClass } from '../../db';
import { ApiClient } from '../../utils/axios/service/apiService';
import logger from '../../utils/logger';
import { addActionHandler } from '../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import { GetUserList } from '@c_chat/shared-protobuf';
import { to, transformPageParams, transformPagination } from '@c_chat/shared-utils';
import { UserTypes } from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';

/** 登录 */
addActionHandler('SignIn', async (params) => {
  const res = await ApiClient.auth.signIn(params);
  if (!res?.access_token) {
    throw new Error('登录失败,不存在token');
  }
  storeTableClass.setAccessToken(res.access_token, params.windowId);
  await socketManager.initSocket(params.windowId);
});

/** 自动登录 - 检查token并初始化socket连接 */
addActionHandler('AutoSignIn', async (params) => {
  // 先检查token是否存在
  const accessToken = storeTableClass.getAccessToken(params.windowId);
  if (!accessToken) {
    logger.info(`[AutoSignIn] 窗口${params.windowId}没有token，跳过socket初始化`);
    throw new Error('窗口没有token，请重新登录');
  }

  socketManager.initSocket(params.windowId);
});

/** 注册 */
addActionHandler('SignUp', async (params) => {
  const res = await ApiClient.auth.signUp(params);
  if (!res?.access_token) {
    throw new Error('注册失败,不存在token');
  }
  storeTableClass.setAccessToken(res.access_token, params.windowId);
  await socketManager.initSocket(params.windowId);
  // return ;
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
