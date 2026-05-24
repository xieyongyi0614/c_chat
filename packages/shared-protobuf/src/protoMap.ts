import {
  GetUserList,
  GetUserListResponse,
  UserInfo,
  ConversationInfo,
  SendMessageRequest,
  GetConversationListRequest,
  GetConversationListResponse,
  GetMessageHistoryRequest,
  GetMessageHistoryResponse,
  ReadMessageRequest,
  ReadMessageResponse,
  ErrorResult,
  AckSendMessage,
  SendFileUploadComplete,
  NewUpdateMessage,
  CreateGroupRequest,
  CreateGroupResponse,
  GetGroupDetailRequest,
  GetGroupDetailResponse,
  UpdateGroupRequest,
  InviteGroupMembersRequest,
  LeaveGroupRequest,
  DismissGroupRequest,
  GroupOperationResponse,
  CallInviteRequest,
  CallInviteResponse,
  CallIncomingNotify,
  CallAcceptRequest,
  CallRejectRequest,
  CallCancelRequest,
  CallHangupRequest,
  CallEndedNotify,
  CallBusyNotify,
  CallTimeoutNotify,
  CallStateSyncNotify,
  CallSdpOffer,
  CallSdpAnswer,
  CallIceCandidate,
  CallIceRestartRequest,
  CallIceRestartNotify,
  CallDeviceStateUpdate,
  CallMuteAudioUpdate,
  CallCameraStateUpdate,
  CallNetworkStateUpdate,
} from '.';

/** 服务端发送socket事件 */
export const ServiceToClientEvent = {
  pong: 'pong',
  error: 'error',

  getUserInfoResponse: 'getUserInfoResponse',
  getUserListResponse: 'getUserListResponse',
  getConversationListResponse: 'getConversationListResponse',
  getMessageHistoryResponse: 'getMessageHistoryResponse',
  ReadMessageResponse: 'ReadMessageResponse',
  createGroupResponse: 'createGroupResponse',
  getGroupDetailResponse: 'getGroupDetailResponse',
  groupOperationResponse: 'groupOperationResponse',

  ackSendMessage: 'ackSendMessage',
  newUpdateMessage: 'newUpdateMessage',
  newConversation: 'newConversation',

  sendFileUploadComplete: 'sendFileUploadComplete',

  callInviteResponse: 'callInviteResponse',
  callIncomingNotify: 'callIncomingNotify',
  callEndedNotify: 'callEndedNotify',
  callBusyNotify: 'callBusyNotify',
  callTimeoutNotify: 'callTimeoutNotify',
  callStateSyncNotify: 'callStateSyncNotify',
  callSdpOffer: 'callSdpOffer',
  callSdpAnswer: 'callSdpAnswer',
  callIceCandidate: 'callIceCandidate',
  callIceRestartNotify: 'callIceRestartNotify',
  callDeviceStateUpdate: 'callDeviceStateUpdate',
  callMuteAudioUpdate: 'callMuteAudioUpdate',
  callCameraStateUpdate: 'callCameraStateUpdate',
  callNetworkStateUpdate: 'callNetworkStateUpdate',
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
  [ServiceToClientEvent.createGroupResponse]: CreateGroupResponse,
  [ServiceToClientEvent.getGroupDetailResponse]: GetGroupDetailResponse,
  [ServiceToClientEvent.groupOperationResponse]: GroupOperationResponse,

  [ServiceToClientEvent.ackSendMessage]: AckSendMessage,
  [ServiceToClientEvent.newUpdateMessage]: NewUpdateMessage,
  [ServiceToClientEvent.newConversation]: ConversationInfo,
  [ServiceToClientEvent.sendFileUploadComplete]: SendFileUploadComplete,

  [ServiceToClientEvent.callInviteResponse]: CallInviteResponse,
  [ServiceToClientEvent.callIncomingNotify]: CallIncomingNotify,
  [ServiceToClientEvent.callEndedNotify]: CallEndedNotify,
  [ServiceToClientEvent.callBusyNotify]: CallBusyNotify,
  [ServiceToClientEvent.callTimeoutNotify]: CallTimeoutNotify,
  [ServiceToClientEvent.callStateSyncNotify]: CallStateSyncNotify,
  [ServiceToClientEvent.callSdpOffer]: CallSdpOffer,
  [ServiceToClientEvent.callSdpAnswer]: CallSdpAnswer,
  [ServiceToClientEvent.callIceCandidate]: CallIceCandidate,
  [ServiceToClientEvent.callIceRestartNotify]: CallIceRestartNotify,
  [ServiceToClientEvent.callDeviceStateUpdate]: CallDeviceStateUpdate,
  [ServiceToClientEvent.callMuteAudioUpdate]: CallMuteAudioUpdate,
  [ServiceToClientEvent.callCameraStateUpdate]: CallCameraStateUpdate,
  [ServiceToClientEvent.callNetworkStateUpdate]: CallNetworkStateUpdate,
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
  createGroup: 'createGroup',
  getGroupDetail: 'getGroupDetail',
  updateGroup: 'updateGroup',
  inviteGroupMembers: 'inviteGroupMembers',
  leaveGroup: 'leaveGroup',
  dismissGroup: 'dismissGroup',
  callInvite: 'callInvite',
  callAccept: 'callAccept',
  callReject: 'callReject',
  callCancel: 'callCancel',
  callHangup: 'callHangup',
  callSdpOffer: 'callSdpOffer',
  callSdpAnswer: 'callSdpAnswer',
  callIceCandidate: 'callIceCandidate',
  callIceRestart: 'callIceRestart',
  callDeviceStateUpdate: 'callDeviceStateUpdate',
  callMuteAudioUpdate: 'callMuteAudioUpdate',
  callCameraStateUpdate: 'callCameraStateUpdate',
  callNetworkStateUpdate: 'callNetworkStateUpdate',
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
  [ClientToServiceEvent.createGroup]: CreateGroupRequest,
  [ClientToServiceEvent.getGroupDetail]: GetGroupDetailRequest,
  [ClientToServiceEvent.updateGroup]: UpdateGroupRequest,
  [ClientToServiceEvent.inviteGroupMembers]: InviteGroupMembersRequest,
  [ClientToServiceEvent.leaveGroup]: LeaveGroupRequest,
  [ClientToServiceEvent.dismissGroup]: DismissGroupRequest,
  [ClientToServiceEvent.callInvite]: CallInviteRequest,
  [ClientToServiceEvent.callAccept]: CallAcceptRequest,
  [ClientToServiceEvent.callReject]: CallRejectRequest,
  [ClientToServiceEvent.callCancel]: CallCancelRequest,
  [ClientToServiceEvent.callHangup]: CallHangupRequest,
  [ClientToServiceEvent.callSdpOffer]: CallSdpOffer,
  [ClientToServiceEvent.callSdpAnswer]: CallSdpAnswer,
  [ClientToServiceEvent.callIceCandidate]: CallIceCandidate,
  [ClientToServiceEvent.callIceRestart]: CallIceRestartRequest,
  [ClientToServiceEvent.callDeviceStateUpdate]: CallDeviceStateUpdate,
  [ClientToServiceEvent.callMuteAudioUpdate]: CallMuteAudioUpdate,
  [ClientToServiceEvent.callCameraStateUpdate]: CallCameraStateUpdate,
  [ClientToServiceEvent.callNetworkStateUpdate]: CallNetworkStateUpdate,
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
  [ClientToServiceEvent.createGroup]: ServiceToClientEvent.createGroupResponse,
  [ClientToServiceEvent.getGroupDetail]: ServiceToClientEvent.getGroupDetailResponse,
  [ClientToServiceEvent.updateGroup]: ServiceToClientEvent.groupOperationResponse,
  [ClientToServiceEvent.inviteGroupMembers]: ServiceToClientEvent.groupOperationResponse,
  [ClientToServiceEvent.leaveGroup]: ServiceToClientEvent.groupOperationResponse,
  [ClientToServiceEvent.dismissGroup]: ServiceToClientEvent.groupOperationResponse,
  [ClientToServiceEvent.callInvite]: ServiceToClientEvent.callInviteResponse,
} as const;

export type ClientPaddingRequestsCallback = {
  [K in keyof typeof ClientPaddingRequestsEvent]: (
    data: (typeof clientDecodeProtoMap)[(typeof ClientPaddingRequestsEvent)[K]] extends null
      ? null
      : InstanceType<
          NonNullable<(typeof clientDecodeProtoMap)[(typeof ClientPaddingRequestsEvent)[K]]>
        >,
  ) => void | Promise<void>;
};

/** ----------------------------------------------------------------- */
