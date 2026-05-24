export const CallSessionState = {
  idle: 'idle',
  inviting: 'inviting',
  ringing_incoming: 'ringing_incoming',
  ringing_outgoing: 'ringing_outgoing',
  accepted: 'accepted',
  connecting: 'connecting',
  in_call: 'in_call',
  reconnecting: 'reconnecting',
  ending: 'ending',
  ended: 'ended',
  rejected: 'rejected',
  cancelled: 'cancelled',
  timeout: 'timeout',
  busy: 'busy',
  failed: 'failed',
} as const;

export type CallSessionState = (typeof CallSessionState)[keyof typeof CallSessionState];

const TERMINAL_CALL_SESSION_STATES = new Set<CallSessionState>([
  CallSessionState.ended,
  CallSessionState.rejected,
  CallSessionState.cancelled,
  CallSessionState.timeout,
  CallSessionState.failed,
]);

const RTC_EXCHANGE_STATES = new Set<CallSessionState>([
  CallSessionState.accepted,
  CallSessionState.connecting,
  CallSessionState.in_call,
  CallSessionState.reconnecting,
]);

const ACTIVE_CALL_SESSION_STATES = new Set<CallSessionState>([
  CallSessionState.inviting,
  CallSessionState.ringing_incoming,
  CallSessionState.ringing_outgoing,
  CallSessionState.accepted,
  CallSessionState.connecting,
  CallSessionState.in_call,
  CallSessionState.reconnecting,
  CallSessionState.ending,
]);

export const isTerminalCallSessionState = (state: CallSessionState): boolean =>
  TERMINAL_CALL_SESSION_STATES.has(state);

export const canTransitionCallSession = (
  from: CallSessionState,
  to: CallSessionState,
): boolean => from === to || !isTerminalCallSessionState(from);

export const canHandleRtcExchange = (state: CallSessionState): boolean =>
  RTC_EXCHANGE_STATES.has(state);

export const isActiveCallSessionState = (state: CallSessionState): boolean =>
  ACTIVE_CALL_SESSION_STATES.has(state);
