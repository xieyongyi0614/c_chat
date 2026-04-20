import { addActionHandler, omitActionCtx } from '../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import {
  CreateConversationRequest,
  GetConversationListRequest,
  GetMessageHistoryRequest,
  ReadMessageRequest,
  SendMessageRequest,
} from '@c_chat/shared-protobuf';
import { SOCKET_PROTO_EVENT } from '@c_chat/shared-protobuf/protoMap';
import { conversationTableClass, messageTableClass } from '../../db';
import { to, transformPageParams, transformPagination } from '@c_chat/shared-utils';
import { RequiredNonNullable, SocketTypes } from '@c_chat/shared-types';

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
  const total = messageTableClass.getMessageCount(params.conversationId);

  return {
    list: localMsgs ?? [],
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
      SOCKET_PROTO_EVENT.getConversationList,
      GetConversationListRequest.encode(
        GetConversationListRequest.create({ ...params, pagination: newPageParams }),
      ).finish(),
    ),
  );
  if (err) {
    console.error('获取线上会话列表失败，加载本地缓存:', err);

    const localList = conversationTableClass.getConversations(
      params.pagination?.page,
      params.pagination?.pageSize,
    );
    return {
      list: localList,
      pagination: { total: localList.length, page: 1, pageSize: 50, totalPage: 0 },
    };
  }

  const records =
    res.list
      ?.map((convo) => ({
        ...(convo as RequiredNonNullable<typeof convo>),
        userNickname: convo.user?.nickname ?? '',
        userAvatar: convo.user?.avatarUrl ?? '',
        groupName: convo.groupName ?? '',
        groupAvatar: convo.groupAvatar ?? '',
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
addActionHandler('SendMessage', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);

  // 检查是否提供了有效的 conversationId
  let conversationId = params.conversationId;

  // 如果没有 conversationId 但有 targetId，则尝试创建会话
  if (!conversationId && params.targetId) {
    // 尝试创建新的对话
    const [err, res] = await to(
      socketService.genericRequest(
        SOCKET_PROTO_EVENT.createConversation,
        CreateConversationRequest.encode(
          CreateConversationRequest.create({ targetId: params.targetId }),
        ).finish(),
      ),
    );

    if (err) {
      console.error('创建会话失败:', err);
      throw err;
    }

    // 更新会话ID为新创建的会话
    conversationId = res.id;

    // 将新创建的会话信息存储到本地数据库
    const newConvo = {
      id: res.id,
      type: res.type,
      targetId: res.targetId,
      lastMsgContent: res.lastMsgContent ?? '',
      lastMsgTime: Number(res.lastMsgContent ?? 0),
      updateTime: Number(res.updateTime ?? 0),
      createTime: Number(res.createTime ?? 0),
      userNickname: res.user?.nickname ?? '',
      userAvatar: res.user?.avatarUrl ?? '',
      groupName: res.groupName ?? '',
      groupAvatar: res.groupAvatar ?? '',
      lastReadMessageId: 0,
    };
    conversationTableClass.upsertConversations([newConvo]);
  } else if (!conversationId) {
    // 如果既没有 conversationId 也没有 targetId，则无法发送消息
    throw new Error('No valid conversationId or targetId provided');
  }

  // 使用实际的会话ID继续发送消息
  const actualParams = {
    ...params,
    conversationId,
  };

  // 1. 存入本地，状态为发送中 (乐观更新)
  const tempId = `temp_${Date.now()}`;
  const senderInfo = socketService.getUserInfo();
  const tempMsg = {
    id: tempId,
    msgId: 0,
    senderId: senderInfo?.id || '',
    conversationId: actualParams.conversationId,
    content: actualParams.content,
    type: actualParams.type || 0,
    state: 1, // sending
    createTime: Date.now(),
    updateTime: Date.now(),
  };
  messageTableClass.upsertMessages([tempMsg]);

  try {
    // 2. 发送到线上
    const res = await socketService.genericRequest(
      SOCKET_PROTO_EVENT.sendMessage,
      SendMessageRequest.encode(SendMessageRequest.create(actualParams)).finish(),
    );

    // 3. 成功后删除临时消息并插入真实消息
    if (res) {
      messageTableClass.deleteMessage(tempId);
      messageTableClass.upsertMessages([
        {
          id: res.id,
          msgId: res.msgId,
          senderId: res.senderId,
          conversationId: res.conversationId,
          content: res.content,
          type: res.type,
          state: 0,
          createTime: Number(res.createTime),
          updateTime: Number(res.updateTime),
        },
      ]);

      // 同时更新会话的最后一条消息快照
      const convo = conversationTableClass.getConversation(res.conversationId);
      if (convo) {
        const updatedConvo = {
          ...convo,
          lastMsgContent: res.content,
          lastMsgTime: Number(res.createTime),
          updateTime: Number(res.updateTime),
        };

        // 更新本地数据库中的会话信息
        conversationTableClass.upsertConversations([updatedConvo]);
      }
    }
    return res;
  } catch (error) {
    // 4. 失败更新状态
    messageTableClass.updateMessageState(tempId, 2); // fail
    console.log('发送消息失败', error);
    throw error;
  }
});

/** 获取消息历史 (本地缓存优先) */
addActionHandler('GetMessageHistory', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  // const newPageParams = transformPageParams(params.pagination);

  const [err, res] = await to(
    socketService.genericRequest(
      SOCKET_PROTO_EVENT.getMessageHistory,
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
      updateTime: Number(msg.updateTime),
      createTime: Number(msg.createTime),
    })) ?? [];
  if (records.length > 0) {
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
      SOCKET_PROTO_EVENT.readMessage,
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
    messageId: Number(res.messageId ?? -1),
    unreadCount: Number(res.unreadCount ?? 0),
  };
});
