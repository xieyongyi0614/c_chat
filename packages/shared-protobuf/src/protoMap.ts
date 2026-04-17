import {
  GetUserList,
  GetUserListResponse,
  UserInfo,
  CreateConversationRequest,
  ConversationInfo,
  SendMessageRequest,
  MessageInfo,
  GetConversationListRequest,
  GetConversationListResponse,
  GetMessageHistoryRequest,
  GetMessageHistoryResponse,
  ErrorResult,
} from '.';

/** 通用 */
export const SOCKET_PROTO_EVENT = {
  ping: 'ping',
  getUserInfo: 'getUserInfo',
  getUserList: 'getUserList',
  createConversation: 'createConversation',
  sendMessage: 'sendMessage',
  getConversationList: 'getConversationList',
  getMessageHistory: 'getMessageHistory',
  error: 'error',
} as const;

/** 客户端使用 */
export const clientDecodeProtoMap = {
  /** 错误信息处理 */
  [SOCKET_PROTO_EVENT.error]: ErrorResult,

  [SOCKET_PROTO_EVENT.getUserInfo]: UserInfo,
  [SOCKET_PROTO_EVENT.ping]: null,
  [SOCKET_PROTO_EVENT.getUserList]: GetUserListResponse,
  [SOCKET_PROTO_EVENT.createConversation]: ConversationInfo,
  [SOCKET_PROTO_EVENT.sendMessage]: MessageInfo,
  [SOCKET_PROTO_EVENT.getConversationList]: GetConversationListResponse,
  [SOCKET_PROTO_EVENT.getMessageHistory]: GetMessageHistoryResponse,
};

export type ClientDecodeProtoMapKey = keyof typeof clientDecodeProtoMap;

export type ClientDecodeProtoCallback = {
  [K in ClientDecodeProtoMapKey]: (
    data: (typeof clientDecodeProtoMap)[K] extends null
      ? null
      : InstanceType<NonNullable<(typeof clientDecodeProtoMap)[K]>>,
  ) => void | Promise<void>;
};

// export type ClientDecodeProtoCallback = {
//   [SOCKET_PROTO_EVENT.getUserInfo]: (data: UserInfo) => void;
//   [SOCKET_PROTO_EVENT.ping]: () => void;
//   [SOCKET_PROTO_EVENT.getUserList]: (data: GetUserListResponse) => void;
//   [SOCKET_PROTO_EVENT.createConversation]: (data: ConversationInfo) => void;
//   [SOCKET_PROTO_EVENT.sendMessage]: (data: MessageInfo) => void;
//   [SOCKET_PROTO_EVENT.getConversationList]: (data: GetConversationListResponse) => void;
//   [SOCKET_PROTO_EVENT.getMessageHistory]: (data: GetMessageHistoryResponse) => void;
// };
// export const PROTO_MAP_KEY = {
//   PING: 101,
//   RESULT: 201,
// } as const;

// export const PROTO_RESULT_TYPE = {
//   ping: 'ping',
//   getUserInfo: 'getUserInfo',
// } as const;

// export type ProtoResultType = (typeof PROTO_RESULT_TYPE)[keyof typeof PROTO_RESULT_TYPE];

// export const resultMap = {
//   [PROTO_RESULT_TYPE.ping]: null,
//   [PROTO_RESULT_TYPE.getUserInfo]: UserInfo,
// };

/** 服务端使用 */
export const serviceDecodeProtoMap = {
  [SOCKET_PROTO_EVENT.getUserInfo]: UserInfo,
  [SOCKET_PROTO_EVENT.ping]: null,
  [SOCKET_PROTO_EVENT.getUserList]: GetUserList,
  [SOCKET_PROTO_EVENT.createConversation]: CreateConversationRequest,
  [SOCKET_PROTO_EVENT.sendMessage]: SendMessageRequest,
  [SOCKET_PROTO_EVENT.getConversationList]: GetConversationListRequest,
  [SOCKET_PROTO_EVENT.getMessageHistory]: GetMessageHistoryRequest,
};
export type ServiceDecodeProtoMapKey = keyof typeof serviceDecodeProtoMap;
