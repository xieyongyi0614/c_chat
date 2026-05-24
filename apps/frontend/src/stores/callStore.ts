import { create } from 'zustand';
import { ipc } from '@c_chat/shared-utils';
import type { CallStoreSnapshot } from '@c_chat/shared-types';

const initialSnapshot: CallStoreSnapshot = {
  activeCall: null,
  direction: null,
  pendingIncomingCall: null,
  ringing: false,
  reconnecting: false,
  error: null,
  lastSeq: 0,
  updatedAt: 0,
};

interface CallStore extends CallStoreSnapshot {
  setSnapshot: (snapshot: CallStoreSnapshot) => void;
  hydrate: () => Promise<void>;
  startCall: (params: Parameters<typeof ipc.StartCall>[0]) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  cancelCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
}

export const useCallStore = create<CallStore>((set, get) => ({
  ...initialSnapshot,

  setSnapshot(snapshot) {
    set(snapshot);
  },

  async hydrate() {
    const snapshot = await ipc.GetCallSnapshot(undefined);
    set(snapshot);
  },

  async startCall(params) {
    const snapshot = await ipc.StartCall(params);
    set(snapshot);
  },

  async acceptCall() {
    const callId = get().activeCall?.callId;
    const snapshot = await ipc.AcceptCall({ callId });
    set(snapshot);
  },

  async rejectCall() {
    const callId = get().activeCall?.callId;
    const snapshot = await ipc.RejectCall({ callId });
    set(snapshot);
  },

  async cancelCall() {
    const callId = get().activeCall?.callId;
    const snapshot = await ipc.CancelCall({ callId });
    set(snapshot);
  },

  async hangupCall() {
    const callId = get().activeCall?.callId;
    const snapshot = await ipc.HangupCall({ callId });
    set(snapshot);
  },
}));
