import {
  CallSessionState,
  canHandleRtcExchange,
  canTransitionCallSession,
  isActiveCallSessionState,
  isTerminalCallSessionState,
} from '@c_chat/shared-types';

describe('call session state rules', () => {
  it('treats ended states as terminal', () => {
    expect(isTerminalCallSessionState(CallSessionState.ended)).toBe(true);
    expect(isTerminalCallSessionState(CallSessionState.rejected)).toBe(true);
    expect(isTerminalCallSessionState(CallSessionState.cancelled)).toBe(true);
    expect(isTerminalCallSessionState(CallSessionState.timeout)).toBe(true);
    expect(isTerminalCallSessionState(CallSessionState.failed)).toBe(true);
    expect(isTerminalCallSessionState(CallSessionState.in_call)).toBe(false);
  });

  it('prevents transitions away from terminal states', () => {
    expect(canTransitionCallSession(CallSessionState.timeout, CallSessionState.accepted)).toBe(false);
    expect(canTransitionCallSession(CallSessionState.ended, CallSessionState.reconnecting)).toBe(false);
    expect(canTransitionCallSession(CallSessionState.ringing_incoming, CallSessionState.accepted)).toBe(true);
  });

  it('only allows RTC exchange after the call is accepted', () => {
    expect(canHandleRtcExchange(CallSessionState.accepted)).toBe(true);
    expect(canHandleRtcExchange(CallSessionState.connecting)).toBe(true);
    expect(canHandleRtcExchange(CallSessionState.in_call)).toBe(true);
    expect(canHandleRtcExchange(CallSessionState.reconnecting)).toBe(true);
    expect(canHandleRtcExchange(CallSessionState.ringing_incoming)).toBe(false);
    expect(canHandleRtcExchange(CallSessionState.timeout)).toBe(false);
  });

  it('marks ringing and connected states as busy states', () => {
    expect(isActiveCallSessionState(CallSessionState.ringing_outgoing)).toBe(true);
    expect(isActiveCallSessionState(CallSessionState.ringing_incoming)).toBe(true);
    expect(isActiveCallSessionState(CallSessionState.in_call)).toBe(true);
    expect(isActiveCallSessionState(CallSessionState.reconnecting)).toBe(true);
    expect(isActiveCallSessionState(CallSessionState.cancelled)).toBe(false);
  });
});
