import { addActionHandler, omitActionCtx } from '../../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import {
  CreateGroupRequest,
  GetConversationListRequest,
  GetGroupDetailRequest,
  UpdateGroupRequest,
  InviteGroupMembersRequest,
  LeaveGroupRequest,
  DismissGroupRequest,
  type IConversationInfo,
  GroupOperationResponse,
} from '@c_chat/shared-protobuf';
import { conversationTableClass } from '../../../db';
import { ipc, to, transformPageParams } from '@c_chat/shared-utils';
import { ConversationType, LocalConversationListItem, SocketTypes } from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';

const toLocalConversation = (convo: IConversationInfo): LocalConversationListItem => {
  if (!convo.id) {
    throw new Error('会话数据缺少 id');
  }

  return {
    id: convo.id,
    type: (convo.type ?? ConversationType.Single) as ConversationType,
    targetId: convo.targetInfo?.id ?? '',
    targetName: convo.targetInfo?.name ?? '',
    targetAvatar: convo.targetInfo?.avatarUrl ?? '',
    lastMsgContent: convo.lastMsgContent ?? '',
    lastMsgTime: Number(convo.lastMsgTime ?? 0),
    unreadCount: Number(convo.unreadCount ?? 0),
    lastReadSeq: BigInt(convo.lastReadSeq ?? 0),
    updateTime: Number(convo.updateTime ?? 0),
    createTime: Number(convo.createTime ?? 0),
  };
};

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

  const records: LocalConversationListItem[] = res.list?.map(toLocalConversation) ?? [];

  if (records) {
    conversationTableClass.upsertConversations(records);
  }

  if (newPageParams.page === 1) {
    conversationTableClass.reconcileGroupConversations(records);
  }

  return { pagination: res.pagination as SocketTypes.PaginationType, list: records };
});

addActionHandler('CreateGroup', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.createGroup,
      CreateGroupRequest.encode(CreateGroupRequest.create(params)).finish(),
    ),
  );

  if (err) {
    console.error('创建群聊失败:', err);
    throw err;
  }

  if (!res.conversation) {
    throw new Error('创建群聊响应缺少会话数据');
  }

  const record = toLocalConversation(res.conversation);
  conversationTableClass.upsertConversations([record]);

  return record;
});

addActionHandler('GetGroupDetail', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.getGroupDetail,
      GetGroupDetailRequest.encode(GetGroupDetailRequest.create(params)).finish(),
    ),
  );

  if (err) {
    console.error('获取群详情失败:', err);
    throw err;
  }

  return res;
});

const decodeGroupOperationResponse = (res: GroupOperationResponse) => ({
  success: Boolean(res.success),
  group: res.group,
  conversation: res.conversation,
});

addActionHandler('UpdateGroup', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.updateGroup,
      UpdateGroupRequest.encode(UpdateGroupRequest.create(params)).finish(),
    ),
  );

  if (err) throw err;
  return decodeGroupOperationResponse(res);
});

addActionHandler('InviteGroupMembers', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.inviteGroupMembers,
      InviteGroupMembersRequest.encode(InviteGroupMembersRequest.create(params)).finish(),
    ),
  );

  if (err) throw err;
  return decodeGroupOperationResponse(res);
});

addActionHandler('LeaveGroup', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.leaveGroup,
      LeaveGroupRequest.encode(LeaveGroupRequest.create(params)).finish(),
    ),
  );

  if (err) throw err;

  const result = decodeGroupOperationResponse(res);
  if (result.conversation?.id) {
    conversationTableClass.deleteConversation(result.conversation.id);
  }
  return result;
});

addActionHandler('DismissGroup', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.dismissGroup,
      DismissGroupRequest.encode(DismissGroupRequest.create(params)).finish(),
    ),
  );

  if (err) throw err;
  const result = decodeGroupOperationResponse(res);
  if (result.conversation?.id) {
    conversationTableClass.deleteConversation(result.conversation.id);
  }
  return result;
});
