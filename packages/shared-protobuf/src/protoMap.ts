import {
  GetUserList,
  GetUserListResponse,
  UserInfo,
  ConversationInfo,
  SendMessageRequest,
  MessageInfo,
  GetConversationListRequest,
  GetConversationListResponse,
  GetMessageHistoryRequest,
  GetMessageHistoryResponse,
  ReadMessageRequest,
  ReadMessageResponse,
  ErrorResult,
  AckSendMessage,
} from '.';

export const ServiceToClientEvent = {
  pong: 'pong',
  error: 'error',

  getUserInfoResponse: 'getUserInfoResponse',
  getUserListResponse: 'getUserListResponse',
  getConversationListResponse: 'getConversationListResponse',
  getMessageHistoryResponse: 'getMessageHistoryResponse',
  ReadMessageResponse: 'ReadMessageResponse',

  ackSendMessage: 'ackSendMessage',
  newMessage: 'newMessage',
  newConversation: 'newConversation',
} as const;

/** 客户端使用 */
export const clientDecodeProtoMap = {
  /** 错误信息处理 */
  [ServiceToClientEvent.pong]: null,
  [ServiceToClientEvent.error]: ErrorResult,

  [ServiceToClientEvent.getUserInfoResponse]: UserInfo,
  [ServiceToClientEvent.getUserListResponse]: GetUserListResponse,
  [ServiceToClientEvent.getConversationListResponse]: GetConversationListResponse,
  [ServiceToClientEvent.getMessageHistoryResponse]: GetMessageHistoryResponse,
  [ServiceToClientEvent.ReadMessageResponse]: ReadMessageResponse,
  // [ServiceToClientEvent.createConversation]: ConversationInfo,

  [ServiceToClientEvent.ackSendMessage]: AckSendMessage,
  [ServiceToClientEvent.newMessage]: MessageInfo,
  [ServiceToClientEvent.newConversation]: ConversationInfo,
};

export type ClientDecodeProtoMapKey = keyof typeof clientDecodeProtoMap;

export type ClientDecodeProtoCallback = {
  [K in ClientDecodeProtoMapKey]: (
    data: (typeof clientDecodeProtoMap)[K] extends null
      ? null
      : InstanceType<NonNullable<(typeof clientDecodeProtoMap)[K]>>,
  ) => void | Promise<void>;
};

/** ----------------------------------------------------------------- */
/** ----------------------------------------------------------------- */
/** ----------------------------------------------------------------- */

/** 客户端发送socket事件 */
export const ClientToServiceEvent = {
  ping: 'ping',
  getUserInfo: 'getUserInfo',
  getUserList: 'getUserList',
  createConversation: 'createConversation',
  sendMessage: 'sendMessage',
  getConversationList: 'getConversationList',
  getMessageHistory: 'getMessageHistory',
  readMessage: 'readMessage',
} as const;

/** 服务端使用 */
export const serviceDecodeProtoMap = {
  [ClientToServiceEvent.ping]: null,
  [ClientToServiceEvent.getUserInfo]: UserInfo,
  [ClientToServiceEvent.getUserList]: GetUserList,
  // [ClientToServiceEvent.createConversation]: CreateConversationRequest,
  [ClientToServiceEvent.sendMessage]: SendMessageRequest,
  [ClientToServiceEvent.getConversationList]: GetConversationListRequest,
  [ClientToServiceEvent.getMessageHistory]: GetMessageHistoryRequest,
  [ClientToServiceEvent.readMessage]: ReadMessageRequest,
};
export type ServiceDecodeProtoMapKey = keyof typeof serviceDecodeProtoMap;

export type ServiceDecodeProtoCallback = {
  [K in ServiceDecodeProtoMapKey]: (
    data: (typeof serviceDecodeProtoMap)[K] extends null
      ? null
      : InstanceType<NonNullable<(typeof serviceDecodeProtoMap)[K]>>,
  ) => void | Promise<void>;
};

/** ----------------------------------------------------------------- */
/** 事件对应响应处理 */
export const ClientPaddingRequestsEvent = {
  [ClientToServiceEvent.ping]: ServiceToClientEvent.pong,
  [ClientToServiceEvent.getUserInfo]: ServiceToClientEvent.getUserInfoResponse,
  [ClientToServiceEvent.getUserList]: ServiceToClientEvent.getUserListResponse,
  // [ClientToServiceEvent.createConversation]: ServiceToClientEvent.newConversation,
  [ClientToServiceEvent.sendMessage]: ServiceToClientEvent.ackSendMessage,
  [ClientToServiceEvent.getConversationList]: ServiceToClientEvent.getConversationListResponse,
  [ClientToServiceEvent.getMessageHistory]: ServiceToClientEvent.getMessageHistoryResponse,
  [ClientToServiceEvent.readMessage]: ServiceToClientEvent.ReadMessageResponse,
} as const;

export type ClientPaddingRequestsCallback = {
  [K in ServiceDecodeProtoMapKey]: (
    data: (typeof clientDecodeProtoMap)[(typeof ClientPaddingRequestsEvent)[K]] extends null
      ? null
      : InstanceType<
          NonNullable<(typeof clientDecodeProtoMap)[(typeof ClientPaddingRequestsEvent)[K]]>
        >,
  ) => void | Promise<void>;
};

/** ----------------------------------------------------------------- */
