import type { IpcMethod } from '../ipcTypes';
import type { ICallIceCandidate, ICallInfo, ICallSignalMeta } from '@c_chat/shared-protobuf';

export type CallType = 'audio' | 'video';

export type LocalCallInfo = Partial<ICallInfo> & {
  callId: string;
  clientCallId: string;
  conversationId: string;
  initiatorId: string;
  targetUserId: string;
  callType: string;
  state: string;
};

export type CallDirection = 'incoming' | 'outgoing';

export interface CallStoreSnapshot {
  activeCall: LocalCallInfo | null;
  direction: CallDirection | null;
  pendingIncomingCall: LocalCallInfo | null;
  ringing: boolean;
  reconnecting: boolean;
  error: string | null;
  lastSeq: number;
  updatedAt: number;
}

export interface StartCallParams {
  conversationId: string;
  targetUserId: string;
  callType: CallType;
}

export interface CallActionParams {
  callId?: string;
  reason?: string;
}

export interface SendCallSdpParams {
  sdp: string;
}

export type SendCallIceCandidateParams = Pick<
  ICallIceCandidate,
  'candidate' | 'sdpMid' | 'sdpMLineIndex'
>;

export type UpdateCallDeviceStateParams = {
  inputDeviceId?: string;
  outputDeviceId?: string;
};

export type UpdateCallMuteAudioParams = {
  muted: boolean;
};

export type UpdateCallCameraStateParams = {
  enabled: boolean;
};

export type UpdateCallNetworkStateParams = {
  state: string;
};

export type CallRtcServerConfig = {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  callId?: string;
  expiresAt?: number;
};

export type CallRtcSignalPayload = {
  event:
    | 'callInviteResponse'
    | 'callIncomingNotify'
    | 'callEndedNotify'
    | 'callBusyNotify'
    | 'callTimeoutNotify'
    | 'callStateSyncNotify'
    | 'callSdpOffer'
    | 'callSdpAnswer'
    | 'callIceCandidate'
    | 'callIceRestartNotify'
    | 'callDeviceStateUpdate'
    | 'callMuteAudioUpdate'
    | 'callCameraStateUpdate'
    | 'callNetworkStateUpdate';
  payload: unknown;
}

export interface CallPreloadTypes {
  GetCallSnapshot: IpcMethod<void, CallStoreSnapshot>;
  OpenCallWindow: IpcMethod<void, boolean>;
  StartCall: IpcMethod<StartCallParams, CallStoreSnapshot>;
  AcceptCall: IpcMethod<CallActionParams | undefined, CallStoreSnapshot>;
  RejectCall: IpcMethod<CallActionParams | undefined, CallStoreSnapshot>;
  CancelCall: IpcMethod<CallActionParams | undefined, CallStoreSnapshot>;
  HangupCall: IpcMethod<CallActionParams | undefined, CallStoreSnapshot>;
  SendCallSdpOffer: IpcMethod<SendCallSdpParams, boolean>;
  SendCallSdpAnswer: IpcMethod<SendCallSdpParams, boolean>;
  SendCallIceCandidate: IpcMethod<SendCallIceCandidateParams, boolean>;
  RestartCallIce: IpcMethod<void, boolean>;
  UpdateCallDeviceState: IpcMethod<UpdateCallDeviceStateParams, boolean>;
  UpdateCallMuteAudio: IpcMethod<UpdateCallMuteAudioParams, boolean>;
  UpdateCallCameraState: IpcMethod<UpdateCallCameraStateParams, boolean>;
  UpdateCallNetworkState: IpcMethod<UpdateCallNetworkStateParams, boolean>;
  GetCallRtcConfig: IpcMethod<{ callId?: string } | void, CallRtcServerConfig>;
}

export type CallSignalMetaInput = Partial<ICallSignalMeta>;
