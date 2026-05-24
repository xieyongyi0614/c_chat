import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import { ipc } from '@c_chat/shared-utils';
import { CallSessionState, type CallStoreSnapshot } from '@c_chat/shared-types';
import {
  Maximize2,
  Mic,
  MicOff,
  Minus,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

const useRingtone = (enabled: boolean) => {
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      audioRef.current?.close();
      audioRef.current = null;
      return;
    }

    const ctx = new AudioContext();
    audioRef.current = ctx;

    const playTone = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.02;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.stop(ctx.currentTime + 0.3);
    };

    void ctx.resume().then(() => {
      playTone();
      timerRef.current = window.setInterval(playTone, 1200);
    });

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      audioRef.current?.close();
      audioRef.current = null;
    };
  }, [enabled]);
};

function App() {
  const [snapshot, setSnapshot] = useState<CallStoreSnapshot>(initialSnapshot);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  useEffect(() => {
    let mounted = true;
    ipc.GetCallSnapshot(undefined).then((data) => {
      if (!mounted) return;
      setSnapshot(data);
    });

    const unsubscribe = window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.CallStateUpdated, (data) => {
      setSnapshot(data);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const call = snapshot.activeCall;
  const isIncoming = call?.state === CallSessionState.ringing_incoming || Boolean(snapshot.pendingIncomingCall);
  const isOutgoing = call?.state === CallSessionState.inviting || call?.state === CallSessionState.ringing_outgoing;
  const isInCall =
    call?.state === CallSessionState.accepted ||
    call?.state === CallSessionState.connecting ||
    call?.state === CallSessionState.in_call ||
    call?.state === CallSessionState.reconnecting;
  const isTerminal =
    call?.state === CallSessionState.ended ||
    call?.state === CallSessionState.rejected ||
    call?.state === CallSessionState.cancelled ||
    call?.state === CallSessionState.timeout ||
    call?.state === CallSessionState.busy ||
    call?.state === CallSessionState.failed;

  useRingtone(Boolean(isIncoming && snapshot.ringing));

  const title = useMemo(() => {
    if (!call) return 'No active call';
    if (snapshot.reconnecting) return 'Reconnecting';
    if (snapshot.error) return 'Call issue';
    if (isIncoming) return 'Incoming call';
    if (isOutgoing) return 'Calling';
    if (isTerminal) return 'Call ended';
    return 'In call';
  }, [call, isIncoming, isOutgoing, isTerminal, snapshot.error, snapshot.reconnecting]);

  const subtitle = call
    ? `${call.callType || 'audio'} · ${call.targetUserId || call.initiatorId || 'unknown'}`
    : 'Open a chat and press the phone button';

  const handleAccept = async () => {
    setSnapshot(await ipc.AcceptCall({ callId: call?.callId }));
  };

  const handleReject = async () => {
    setSnapshot(await ipc.RejectCall({ callId: call?.callId }));
  };

  const handleCancel = async () => {
    setSnapshot(await ipc.CancelCall({ callId: call?.callId }));
  };

  const handleHangup = async () => {
    setSnapshot(await ipc.HangupCall({ callId: call?.callId }));
  };

  const toggleAlwaysOnTop = () => {
    setAlwaysOnTop(window.c_chat.toggleCurrentWindowAlwaysOnTop());
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#171717] text-zinc-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#202020] px-3 [-webkit-app-region:drag]">
        <div className="min-w-0 truncate text-sm font-medium text-zinc-300">C Chat Call</div>
        <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
          <button className="call-window-button" type="button" onClick={toggleAlwaysOnTop} title="Always on top">
            <Maximize2 className={alwaysOnTop ? 'size-4 text-emerald-400' : 'size-4'} />
          </button>
          <button className="call-window-button" type="button" onClick={() => window.c_chat.minimizeCurrentWindow()} title="Minimize">
            <Minus className="size-4" />
          </button>
          <button className="call-window-button call-window-close" type="button" onClick={() => window.close()} title="Close">
            <X className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-between px-7 py-8">
        <section className="flex w-full flex-1 flex-col items-center justify-center text-center">
          <div className="grid size-28 place-items-center rounded-full bg-zinc-800 shadow-inner">
            {snapshot.reconnecting ? (
              <ShieldAlert className="size-12 text-amber-300" />
            ) : call?.callType === 'video' ? (
              <Video className="size-12 text-emerald-300" />
            ) : (
              <PhoneCall className="size-12 text-emerald-300" />
            )}
          </div>
          <h1 className="mt-7 text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 max-w-full truncate text-sm text-zinc-400">{subtitle}</p>
          {call?.conversationId && (
            <p className="mt-1 max-w-full truncate text-xs text-zinc-500">{call.conversationId}</p>
          )}
        </section>

        <section className="w-full">
          {isIncoming && !isTerminal ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-400"
                onClick={() => void handleAccept()}
              >
                <PhoneCall className="size-5" />
                Accept
              </button>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-red-500 text-sm font-medium text-white hover:bg-red-400"
                onClick={() => void handleReject()}
              >
                <PhoneOff className="size-5" />
                Decline
              </button>
            </div>
          ) : isOutgoing && !isTerminal ? (
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-red-500 text-sm font-medium text-white hover:bg-red-400"
              onClick={() => void handleCancel()}
            >
              <PhoneOff className="size-5" />
              Cancel
            </button>
          ) : isInCall ? (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-800 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
              >
                <Mic className="size-5" />
                Mute
              </button>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-800 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
              >
                <Video className="size-5" />
                Video
              </button>
              <button
                type="button"
                className="grid size-12 place-items-center rounded-md bg-red-500 text-white hover:bg-red-400"
                onClick={() => void handleHangup()}
                title="Hang up"
              >
                <PhoneOff className="size-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zinc-800 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
              onClick={() => window.close()}
            >
              <MicOff className="size-5" />
              Close
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
