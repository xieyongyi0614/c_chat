import { addActionHandler, omitActionCtx } from '../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import {
  GetConversationListRequest,
  GetMessageHistoryRequest,
  ReadMessageRequest,
  SendMessageRequest,
} from '@c_chat/shared-protobuf';
import { conversationTableClass, messageTableClass } from '../../db';
import { ipc, to, transformPageParams, transformPagination, uuidv4 } from '@c_chat/shared-utils';
import {
  LocalConversationListItem,
  MessageStatusEnum,
  RequiredNonNullable,
  SocketTypes,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { now } from 'lodash';

/** 创建会话 (本地生成ID，不立即提交线上) */
// addActionHandler('CreateConversation', async (data) => {
//   const params = omitActionCtx(data);
//   const socketService = socketManager.getSocketService(data.windowId);
//   // 这里可以根据业务逻辑生成确定性ID，或者先查询本地
//   // 目前先透传给后端，但前端可以改为不立即调用此接口
//   const [err, res] = await to(
//     socketService.genericRequest(
//       SOCKET_PROTO_EVENT.createConversation,
//       CreateConversationRequest.encode(CreateConversationRequest.create(params)).finish(),
//     ),
//   );
//   if (err) {
//     console.error('创建会话失败:', err);

//     return;
//   }
//   console.log(res, 'CreateConversation res');
//   return;
// });

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

/** 获取本地消息历史 */
addActionHandler('GetLocalMessageHistory', async (data) => {
  const params = omitActionCtx(data);
  const page = params?.pagination?.page || 1;
  const pageSize = params?.pagination?.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const localMsgs = messageTableClass.getMessagesByConversationId(
    params.conversationId,
    pageSize,
    offset,
  );
  // const total = messageTableClass.getMessageCount(params.conversationId);

  return {
    list: localMsgs ?? [],
    pagination: {
      total: 0,
      page,
      pageSize,
      // totalPage: Math.ceil(total / pageSize),
      totalPage: 0,
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

/** 发送消息 (存入本地并更新会话) */
addActionHandler('SendMessage', async (params) => {
  const socketService = socketManager.getSocketService(params.windowId);

  const conversationId = params.conversationId;

  // 新会话
  // if (!conversationId && params.targetId) {
  //   const [err, res] = await to(
  //     socketService.genericRequest(
  //       ClientToServiceEvent.createConversation,
  //       CreateConversationRequest.encode(
  //         CreateConversationRequest.create({ targetId: params.targetId }),
  //       ).finish(),
  //     ),
  //   );

  //   if (err) {
  //     console.error('创建会话失败:', err);
  //     throw err;
  //   }
  //   conversationId = res.id;
  //   newConvo = {
  //     ...(res as RequiredNonNullable<typeof res>),
  //     lastMsgTime: Number(res.lastMsgTime),
  //     updateTime: Number(res.updateTime),
  //     createTime: Number(res.createTime),
  //     targetId: res.targetInfo?.id ?? '',
  //     targetName: res.targetInfo?.name ?? '',
  //     targetAvatar: res.targetInfo?.avatarUrl ?? '',
  //   };
  //   conversationTableClass.upsertConversations([newConvo]);
  // } else if (!conversationId) {
  //   throw new Error('参数错误，缺少会话ID');
  // }

  // const actualParams = { ...params, conversationId };

  // // 1. 存入本地
  // const tempId = `temp_${Date.now()}`;
  // const senderInfo = socketService.getUserInfo();
  // const tempMsg = {
  //   id: tempId,
  //   msgId: 0,
  //   senderId: senderInfo?.id || '',
  //   conversationId: actualParams.conversationId,
  //   content: actualParams.content,
  //   type: actualParams.type || 0,
  //   state: 1, // sending
  //   createTime: Date.now(),
  //   updateTime: Date.now(),
  // };
  // messageTableClass.upsertMessages([tempMsg]);
  const senderInfo = socketService.getUserInfo();
  const localMessageData = {
    id: uuidv4(),
    conversationId: conversationId ?? '',
    msgId: 0,
    clientMsgId: uuidv4(),
    senderId: senderInfo?.id ?? '',
    content: params.content,
    type: params.type,
    status: MessageStatusEnum.sending,
    createTime: now(),
    localTime: now(),
    updateTime: now(),
    fileId: '',
    mediaGroupId: '',
  };
  messageTableClass.insert(localMessageData);

  // 2. 发送到线上
  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.sendMessage,
      SendMessageRequest.encode(
        SendMessageRequest.create({ ...params, clientMsgId: localMessageData.clientMsgId }),
      ).finish(),
    ),
  );
  if (err || res.status !== 'ok') {
    // messageTableClass.updateMessageState(tempId, 2);
    console.log('发送消息失败', err);
    throw err || new Error('发送消息失败');
  }
  // const messageInfo: LocalMessageListItem = {
  //   ...res,
  //   createTime: Number(res.createTime),
  //   updateTime: Number(res.updateTime),
  // };
  // // messageTableClass.deleteMessage(tempId);
  // messageTableClass.upsertMessages([messageInfo]);

  // // 同时更新会话的最后一条消息快照
  // const convo = conversationTableClass.getConversation(res.conversationId);
  // if (convo) {
  //   const updatedConvo = {
  //     ...convo,
  //     lastMsgContent: res.content,
  //     lastMsgTime: Number(res.createTime),
  //     updateTime: Number(res.updateTime),
  //   };

  //   // 更新本地数据库中的会话信息
  //   conversationTableClass.upsertConversations([updatedConvo]);
  // }
  console.log('localMessageData', localMessageData);
  return localMessageData;
});

/** 获取消息历史 (本地缓存优先) */
addActionHandler('GetMessageHistory', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  // const newPageParams = transformPageParams(params.pagination);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.getMessageHistory,
      GetMessageHistoryRequest.encode(GetMessageHistoryRequest.create(params)).finish(),
    ),
  );

  if (err) {
    return {
      list: [],
      pagination: transformPagination(params.pagination),
    };
  }
  console.log('GetMessageHistory res', res);
  // 更新本地缓存
  const records =
    res.list?.map((msg) => ({
      ...(msg as RequiredNonNullable<typeof msg>),
      state: 0,
      status: MessageStatusEnum.success,
      updateTime: Number(msg.updateTime),
      localTime: Number(msg.createTime),
      createTime: Number(msg.createTime),
    })) ?? [];
  if (records.length > 0) {
    console.log('recodes', records);
    messageTableClass.upsertMessages(records);
  }
  return {
    list: records,
    pagination: transformPagination(params.pagination),
  };
});

/** 标记会话已读 */
addActionHandler('ReadMessage', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.readMessage,
      ReadMessageRequest.encode(ReadMessageRequest.create(params)).finish(),
    ),
  );

  if (err) {
    console.error('标记消息已读失败:', err);
    throw err;
  }

  const convo = conversationTableClass.getConversation(params.conversationId);
  if (convo) {
    conversationTableClass.upsertConversations([
      {
        ...convo,
        unreadCount: Number(res.unreadCount ?? 0),
        lastReadMessageId: Number(res.messageId ?? 0),
      },
    ]);
  }

  return {
    conversationId: res.conversationId,
    messageId: Number(res.messageId ?? 0),
    unreadCount: Number(res.unreadCount ?? 0),
  };
});
