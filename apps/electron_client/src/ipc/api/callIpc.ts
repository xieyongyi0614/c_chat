import { addActionHandler } from '../util';
import { callManager } from '@c_chat/electron_client/utils/call/CallManager';

addActionHandler('GetCallSnapshot', async () => {
  return callManager.getSnapshot();
});

addActionHandler('OpenCallWindow', async () => {
  return callManager.openCallWindow();
});

addActionHandler('StartCall', async (params) => {
  return callManager.startCall(params.windowId, params);
});

addActionHandler('AcceptCall', async (params) => {
  return callManager.accept(params.windowId, params);
});

addActionHandler('RejectCall', async (params) => {
  return callManager.reject(params.windowId, params);
});

addActionHandler('CancelCall', async (params) => {
  return callManager.cancel(params.windowId, params);
});

addActionHandler('HangupCall', async (params) => {
  return callManager.hangup(params.windowId, params);
});

addActionHandler('SendCallSdpOffer', async (params) => {
  callManager.sendSdpOffer(params.windowId, params.sdp);
  return true;
});

addActionHandler('SendCallSdpAnswer', async (params) => {
  callManager.sendSdpAnswer(params.windowId, params.sdp);
  return true;
});

addActionHandler('SendCallIceCandidate', async (params) => {
  callManager.sendIceCandidate(params.windowId, params);
  return true;
});

addActionHandler('RestartCallIce', async (params) => {
  callManager.restartIce(params.windowId);
  return true;
});

addActionHandler('UpdateCallDeviceState', async (params) => {
  callManager.updateDeviceState(params.windowId, params.inputDeviceId, params.outputDeviceId);
  return true;
});

addActionHandler('UpdateCallMuteAudio', async (params) => {
  callManager.updateMuteAudio(params.windowId, params.muted);
  return true;
});

addActionHandler('UpdateCallCameraState', async (params) => {
  callManager.updateCameraState(params.windowId, params.enabled);
  return true;
});

addActionHandler('UpdateCallNetworkState', async (params) => {
  callManager.updateNetworkState(params.windowId, params.state);
  return true;
});
