import { addActionHandler, omitActionCtx } from '../util';
import { socketService } from '@c_chat/electron_client/utils/socket-io-client';
import {
  CreateConversationRequest,
  GetConversationListRequest,
  GetMessageHistoryRequest,
  SendMessageRequest,
} from '@c_chat/shared-protobuf';
import { SOCKET_PROTO_EVENT } from '@c_chat/shared-protobuf/protoMap';

/** 创建会话 */
addActionHandler('CreateConversation', async (data) => {
  return socketService.genericRequest(
    SOCKET_PROTO_EVENT.createConversation,
    CreateConversationRequest.encode(
      CreateConversationRequest.create(omitActionCtx(data)),
    ).finish(),
  );
});

/** 获取会话列表 */
addActionHandler('GetConversationList', async (data) => {
  return socketService.genericRequest(
    SOCKET_PROTO_EVENT.getConversationList,
    GetConversationListRequest.encode(GetConversationListRequest.create(data)).finish(),
  );
});

/** 发送消息 */
addActionHandler('SendMessage', async (data) => {
  return socketService.genericRequest(
    SOCKET_PROTO_EVENT.sendMessage,
    SendMessageRequest.encode(SendMessageRequest.create(data)).finish(),
  );
});

/** 获取消息历史 */
addActionHandler('GetMessageHistory', async (data) => {
  return socketService.genericRequest(
    SOCKET_PROTO_EVENT.getMessageHistory,
    GetMessageHistoryRequest.encode(GetMessageHistoryRequest.create(data)).finish(),
  );
});
