import initOsData from '@c_chat/electron_client/utils/osData';
import { WindowManager } from '@c_chat/electron_client/main/windows/windowManager';
import { CallWindowManager } from '@c_chat/electron_client/main/windows/callWindow';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import {
  CallAcceptRequest,
  CallCameraStateUpdate,
  CallCancelRequest,
  CallDeviceStateUpdate,
  CallHangupRequest,
  CallIceCandidate,
  CallIceRestartRequest,
  CallInfo,
  CallInviteRequest,
  CallMuteAudioUpdate,
  CallNetworkStateUpdate,
  CallRejectRequest,
  CallSdpAnswer,
  CallSdpOffer,
  type ICallInfo,
  type ICallSignalMeta,
} from '@c_chat/shared-protobuf';
import { ClientToServiceEvent, type ServiceDecodeProtoMapKey } from '@c_chat/shared-protobuf/protoMap';
import {
  CallSessionState,
  type CallActionParams,
  type CallDirection,
  type CallStoreSnapshot,
  type LocalCallInfo,
  type SendCallIceCandidateParams,
  type StartCallParams,
} from '@c_chat/shared-types';
import { uuidv4 } from '@c_chat/shared-utils';

const terminalStates = new Set<string>([
  CallSessionState.ended,
  CallSessionState.rejected,
  CallSessionState.cancelled,
  CallSessionState.timeout,
  CallSessionState.busy,
  CallSessionState.failed,
]);

const toLocalCallInfo = (call?: ICallInfo | CallInfo | null): LocalCallInfo | null => {
  if (!call?.callId || !call.clientCallId) return null;

  return {
    ...call,
    callId: call.callId,
    clientCallId: call.clientCallId,
    conversationId: call.conversationId ?? '',
    initiatorId: call.initiatorId ?? '',
    targetUserId: call.targetUserId ?? '',
    callType: call.callType ?? 'audio',
    state: call.state ?? CallSessionState.idle,
  };
};

export class CallManager {
  private static instance: CallManager;

  private snapshot: CallStoreSnapshot = {
    activeCall: null,
    direction: null,
    pendingIncomingCall: null,
    ringing: false,
    reconnecting: false,
    error: null,
    lastSeq: 0,
    updatedAt: Date.now(),
  };

  private ownerWindowId: number | null = null;

  static getInstance() {
    if (!CallManager.instance) {
      CallManager.instance = new CallManager();
    }
    return CallManager.instance;
  }

  getSnapshot(): CallStoreSnapshot {
    return { ...this.snapshot };
  }

  openCallWindow() {
    return CallWindowManager.getInstance().open(this.snapshot);
  }

  async startCall(windowId: number, params: StartCallParams) {
    this.ownerWindowId = windowId;
    const socket = socketManager.getSocketService(windowId);
    const userInfo = socket.getUserInfo();
    const clientCallId = uuidv4();

    this.setSnapshot({
      activeCall: {
        callId: '',
        clientCallId,
        conversationId: params.conversationId,
        initiatorId: userInfo?.id ?? '',
        targetUserId: params.targetUserId,
        callType: params.callType,
        state: CallSessionState.inviting,
      },
      direction: 'outgoing',
      pendingIncomingCall: null,
      ringing: true,
      error: null,
    });

    const response = await socket.genericRequest(
      ClientToServiceEvent.callInvite,
      CallInviteRequest.encode(
        CallInviteRequest.create({
          clientCallId,
          conversationId: params.conversationId,
          targetUserId: params.targetUserId,
          callType: params.callType,
          senderDeviceId: initOsData().machineId,
        }),
      ).finish(),
    );

    this.applyCall(response.call, 'outgoing');
    return this.getSnapshot();
  }

  async accept(windowId: number, params?: CallActionParams) {
    const meta = this.buildMeta(windowId, params?.callId);
    this.send(windowId, ClientToServiceEvent.callAccept, CallAcceptRequest.encode({ meta }).finish());
    this.setSnapshot({ ringing: false, direction: this.snapshot.direction ?? 'incoming' });
    return this.getSnapshot();
  }

  async reject(windowId: number, params?: CallActionParams) {
    const meta = this.buildMeta(windowId, params?.callId);
    this.send(
      windowId,
      ClientToServiceEvent.callReject,
      CallRejectRequest.encode({ meta, reason: params?.reason ?? 'rejected' }).finish(),
    );
    this.finishLocal(CallSessionState.rejected);
    return this.getSnapshot();
  }

  async cancel(windowId: number, params?: CallActionParams) {
    const meta = this.buildMeta(windowId, params?.callId);
    this.send(windowId, ClientToServiceEvent.callCancel, CallCancelRequest.encode({ meta }).finish());
    this.finishLocal(CallSessionState.cancelled);
    return this.getSnapshot();
  }

  async hangup(windowId: number, params?: CallActionParams) {
    const meta = this.buildMeta(windowId, params?.callId);
    this.send(
      windowId,
      ClientToServiceEvent.callHangup,
      CallHangupRequest.encode({ meta, reason: params?.reason ?? 'ended' }).finish(),
    );
    this.finishLocal(CallSessionState.ended);
    return this.getSnapshot();
  }

  sendSdpOffer(windowId: number, sdp: string) {
    this.send(
      windowId,
      ClientToServiceEvent.callSdpOffer,
      CallSdpOffer.encode({ meta: this.buildMeta(windowId), sdp }).finish(),
    );
  }

  sendSdpAnswer(windowId: number, sdp: string) {
    this.send(
      windowId,
      ClientToServiceEvent.callSdpAnswer,
      CallSdpAnswer.encode({ meta: this.buildMeta(windowId), sdp }).finish(),
    );
  }

  sendIceCandidate(windowId: number, params: SendCallIceCandidateParams) {
    this.send(
      windowId,
      ClientToServiceEvent.callIceCandidate,
      CallIceCandidate.encode({ meta: this.buildMeta(windowId), ...params }).finish(),
    );
  }

  restartIce(windowId: number) {
    this.send(
      windowId,
      ClientToServiceEvent.callIceRestart,
      CallIceRestartRequest.encode({ meta: this.buildMeta(windowId) }).finish(),
    );
  }

  updateDeviceState(windowId: number, inputDeviceId?: string, outputDeviceId?: string) {
    this.send(
      windowId,
      ClientToServiceEvent.callDeviceStateUpdate,
      CallDeviceStateUpdate.encode({
        meta: this.buildMeta(windowId),
        inputDeviceId,
        outputDeviceId,
      }).finish(),
    );
  }

  updateMuteAudio(windowId: number, muted: boolean) {
    this.send(
      windowId,
      ClientToServiceEvent.callMuteAudioUpdate,
      CallMuteAudioUpdate.encode({ meta: this.buildMeta(windowId), muted }).finish(),
    );
  }

  updateCameraState(windowId: number, enabled: boolean) {
    this.send(
      windowId,
      ClientToServiceEvent.callCameraStateUpdate,
      CallCameraStateUpdate.encode({ meta: this.buildMeta(windowId), enabled }).finish(),
    );
  }

  updateNetworkState(windowId: number, state: string) {
    this.send(
      windowId,
      ClientToServiceEvent.callNetworkStateUpdate,
      CallNetworkStateUpdate.encode({ meta: this.buildMeta(windowId), state }).finish(),
    );
  }

  handleIncoming(call?: ICallInfo | null) {
    const localCall = toLocalCallInfo(call);
    if (!localCall) return;
    this.ownerWindowId = this.ownerWindowId ?? this.pickOwnerWindowId();
    this.setSnapshot({
      activeCall: localCall,
      direction: 'incoming',
      pendingIncomingCall: localCall,
      ringing: true,
      error: null,
    });
  }

  handleCallUpdate(call?: ICallInfo | null, direction?: CallDirection) {
    this.applyCall(call, direction);
  }

  handleSocketDisconnected() {
    if (!this.snapshot.activeCall) return;
    this.setSnapshot({ reconnecting: true });
  }

  handleSocketReconnected() {
    if (!this.snapshot.activeCall) return;
    this.setSnapshot({ reconnecting: false });
  }

  handleWindowClosed(windowId: number) {
    if (this.ownerWindowId !== windowId) return;
    this.ownerWindowId = this.pickOwnerWindowId();
    if (!this.ownerWindowId && this.snapshot.activeCall) {
      this.finishLocal(CallSessionState.failed, 'owner_window_closed');
    }
  }

  private applyCall(call?: ICallInfo | null, direction?: CallDirection) {
    const localCall = toLocalCallInfo(call);
    if (!localCall) return;

    if (terminalStates.has(localCall.state)) {
      this.setSnapshot({
        activeCall: localCall,
        pendingIncomingCall: null,
        ringing: false,
        reconnecting: false,
        direction: direction ?? this.snapshot.direction,
      });
      return;
    }

    this.setSnapshot({
      activeCall: localCall,
      pendingIncomingCall:
        localCall.state === CallSessionState.ringing_incoming ? localCall : null,
      ringing:
        localCall.state === CallSessionState.ringing_incoming ||
        localCall.state === CallSessionState.ringing_outgoing ||
        localCall.state === CallSessionState.inviting,
      direction: direction ?? this.snapshot.direction,
      error: null,
    });
  }

  private finishLocal(state: string, reason?: string) {
    const activeCall = this.snapshot.activeCall
      ? { ...this.snapshot.activeCall, state, endReason: reason ?? this.snapshot.activeCall.endReason }
      : null;
    this.setSnapshot({
      activeCall,
      pendingIncomingCall: null,
      ringing: false,
      reconnecting: false,
    });
  }

  private setSnapshot(next: Partial<CallStoreSnapshot>) {
    this.snapshot = {
      ...this.snapshot,
      ...next,
      lastSeq: this.snapshot.lastSeq + 1,
      updatedAt: Date.now(),
    };
    WindowManager.sendToAllWindows(ELECTRON_TO_CLIENT_CHANNELS.CallStateUpdated, this.snapshot);
    CallWindowManager.getInstance().sync(this.snapshot);
  }

  private buildMeta(windowId: number, callId?: string): ICallSignalMeta {
    const activeCall = this.snapshot.activeCall;
    if (!activeCall) {
      throw new Error('No active call');
    }
    if (callId && activeCall.callId && activeCall.callId !== callId) {
      throw new Error('Call id mismatch');
    }

    const socket = socketManager.getSocketService(windowId);
    const userId = socket.getUserInfo()?.id ?? '';
    const peerUserId =
      activeCall.initiatorId === userId ? activeCall.targetUserId : activeCall.initiatorId;

    return {
      callId: activeCall.callId,
      clientCallId: activeCall.clientCallId,
      conversationId: activeCall.conversationId,
      senderId: userId,
      targetUserId: peerUserId,
      senderDeviceId: initOsData().machineId,
      seq: this.snapshot.lastSeq + 1,
      timestamp: Date.now(),
    };
  }

  private send(windowId: number, event: ServiceDecodeProtoMapKey, payload: Uint8Array) {
    socketManager.getSocketService(windowId).sendCallSignal(event, payload);
  }

  private pickOwnerWindowId(): number | null {
    const ids = WindowManager.getInstance().getAllWindowIds();
    return ids[0] ?? null;
  }
}

export const callManager = CallManager.getInstance();
