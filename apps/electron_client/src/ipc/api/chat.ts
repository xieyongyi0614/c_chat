import { addActionHandler, omitActionCtx } from '../util';
import { socketService } from '@c_chat/electron_client/utils/socket-io-client';
import {
  CreateConversationRequest,
  GetConversationListRequest,
  GetMessageHistoryRequest,
  SendMessageRequest,
} from '@c_chat/shared-protobuf';
import { SOCKET_PROTO_EVENT } from '@c_chat/shared-protobuf/protoMap';
import { conversationTableClass, messageTableClass } from '../../db';
import { GetConversationListResponse } from '@c_chat/shared-protobuf';

/** 创建会话 (本地生成ID，不立即提交线上) */
addActionHandler('CreateConversation', async (data) => {
  const params = omitActionCtx(data);
  // 这里可以根据业务逻辑生成确定性ID，或者先查询本地
  // 目前先透传给后端，但前端可以改为不立即调用此接口
  return socketService.genericRequest(
    SOCKET_PROTO_EVENT.createConversation,
    CreateConversationRequest.encode(CreateConversationRequest.create(params)).finish(),
  );
});

/** 获取本地会话列表 */
addActionHandler('GetLocalConversationList', async () => {
  const localList = conversationTableClass.getAllConversations();
  return {
    list: localList,
    pagination: { total: localList.length, page: 1, pageSize: 50 },
  };
});

/** 获取本地消息历史 */
addActionHandler('GetLocalMessageHistory', async (data) => {
  const params = omitActionCtx(data);
  const localMsgs = messageTableClass.getMessagesByConversationId(params.conversation_id);
  return {
    list: localMsgs,
    pagination: { total: localMsgs.length, page: 1, pageSize: 50 },
  };
});

/** 获取会话列表 (带同步逻辑) */
addActionHandler('GetConversationList', async (data) => {
  const params = omitActionCtx(data);

  try {
    // GetConversationListResponse
    const remoteRes = await socketService.genericRequest(
      SOCKET_PROTO_EVENT.getConversationList,
      GetConversationListRequest.encode(GetConversationListRequest.create(params)).finish(),
    );

    // 更新本地缓存
    if (remoteRes && remoteRes.list) {
      remoteRes.list.forEach((convo) => {
        conversationTableClass.upsertConversation({
          id: convo.id,
          type: convo.type,
          target_id: convo.targetId || '',
          last_msg_content: convo.lastMsgContent,
          last_msg_time: Number(convo.lastMsgTime),
          update_time: Number(convo.updateTime),
          create_time: Number(convo.updateTime),
        });
      });
    }
    return remoteRes;
  } catch (error) {
    console.error('获取线上会话列表失败，加载本地缓存:', error);
    const localList = conversationTableClass.getAllConversations();
    return {
      list: localList,
      pagination: { total: localList.length, page: 1, pageSize: 50 },
    };
  }
});

/** 发送消息 (存入本地并更新会话) */
addActionHandler('SendMessage', async (data) => {
  const params = omitActionCtx(data);

  // 1. 存入本地，状态为发送中 (此处逻辑可根据需要细化)
  // 2. 发送到线上
  const res: any = await socketService.genericRequest(
    SOCKET_PROTO_EVENT.sendMessage,
    SendMessageRequest.encode(SendMessageRequest.create(params)).finish(),
  );

  // 3. 更新本地缓存
  if (res) {
    messageTableClass.upsertMessage({
      id: res.id,
      sender_id: res.sender_id,
      conversation_id: res.conversation_id,
      content: res.content,
      type: res.type,
      state: 0, // success
      create_time: Number(res.create_time),
      update_time: Number(res.update_time),
    });

    // 同时更新会话的最后一条消息快照
    const convo = conversationTableClass.getConversation(res.conversation_id);
    if (convo) {
      conversationTableClass.upsertConversation({
        ...convo,
        last_msg_content: res.content,
        last_msg_time: Number(res.create_time),
        update_time: Number(res.update_time),
      });
    }
  }

  return res;
});

/** 获取消息历史 (本地缓存优先) */
addActionHandler('GetMessageHistory', async (data) => {
  const params = omitActionCtx(data);

  try {
    const remoteRes: any = await socketService.genericRequest(
      SOCKET_PROTO_EVENT.getMessageHistory,
      GetMessageHistoryRequest.encode(GetMessageHistoryRequest.create(params)).finish(),
    );

    // 更新本地缓存
    if (remoteRes && remoteRes.list) {
      remoteRes.list.forEach((msg: any) => {
        messageTableClass.upsertMessage({
          id: msg.id,
          sender_id: msg.sender_id,
          conversation_id: msg.conversation_id,
          content: msg.content,
          type: msg.type,
          state: 0,
          create_time: Number(msg.create_time),
          update_time: Number(msg.update_time),
        });
      });
    }
    return remoteRes;
  } catch (error) {
    console.error('获取线上消息历史失败，加载本地缓存:', error);
    const localMsgs = messageTableClass.getMessagesByConversationId(params.conversation_id);
    return {
      list: localMsgs,
      pagination: { total: localMsgs.length, page: 1, pageSize: 50 },
    };
  }
});
