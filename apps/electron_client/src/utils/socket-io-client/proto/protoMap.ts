import { UserInfo } from '.';

export const SOCKET_PROTO_EVENT = {
  ping: 'ping',
  getUserInfo: 'getUserInfo',
} as const;

export const protoMap = {
  [SOCKET_PROTO_EVENT.getUserInfo]: UserInfo,
  [SOCKET_PROTO_EVENT.ping]: null,
};

export type SocketProtoEventType = keyof typeof protoMap;

export type SocketProtoEventData = {
  [SOCKET_PROTO_EVENT.getUserInfo]: (data: UserInfo) => void;
  [SOCKET_PROTO_EVENT.ping]: () => void;
};
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
