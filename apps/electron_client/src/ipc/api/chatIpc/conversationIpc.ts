import { addActionHandler, omitActionCtx } from '../../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import { GetConversationListRequest } from '@c_chat/shared-protobuf';
import { conversationTableClass } from '../../../db';
import { ipc, to, transformPageParams } from '@c_chat/shared-utils';
import { LocalConversationListItem, RequiredNonNullable, SocketTypes } from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';

/** 获取本地会话列表 */
addActionHandler('GetLocalConversationList', async (data) => {
  const params = omitActionCtx(data);

  const { page, pageSize } = transformPageParams(params.pagination);

  const localList = conversationTableClass.getConversations(page, pageSize);
  const total = conversationTableClass.getConversationCount();

  return {
    list: localList ?? [],
    pagination: {
      total,
      page,
      pageSize,
      totalPage: Math.ceil(total / pageSize),
    },
  };
});

/** 获取会话列表 (带同步逻辑) */
addActionHandler('GetConversationList', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  const newPageParams = transformPageParams(params.pagination);
  // 1. 获取本地最新的更新时间，进行增量同步
  // const lastUpdateTime = conversationTableClass.getLatestUpdateTime();
  // if (lastUpdateTime > 0) {
  //   params.pagination = { ...params.pagination, lastUpdateTime: lastUpdateTime };
  // }

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.getConversationList,
      GetConversationListRequest.encode(
        GetConversationListRequest.create({ ...params, pagination: newPageParams }),
      ).finish(),
    ),
  );
  if (err) {
    console.error('获取线上会话列表失败，加载本地缓存:', err);

    return await ipc.GetLocalConversationList(params);
  }
  console.log('获取线上会话列表成功:', res.list);

  const records: LocalConversationListItem[] =
    res.list
      ?.map((convo) => ({
        ...(convo as RequiredNonNullable<typeof convo>),
        targetId: convo.targetInfo?.id ?? '',
        targetName: convo.targetInfo?.name ?? '',
        targetAvatar: convo.targetInfo?.avatarUrl ?? '',
        lastMsgTime: Number(convo.lastMsgTime),
        updateTime: Number(convo.updateTime),
        createTime: Number(convo.createTime),
      }))
      .filter((item) => item.id !== undefined) ?? [];

  if (records) {
    conversationTableClass.upsertConversations(records);
  }
  return { pagination: res.pagination as SocketTypes.PaginationType, list: records };
});
