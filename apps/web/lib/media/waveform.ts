import { decodeWaveformFromBase64, encodeWaveformToBase64, interpolateArray } from '@c_chat/shared-utils';

export const VOICE_MIN_DURATION_MS = 1000;
export const VOICE_MAX_DURATION_MS = 60_000;

/** 录音波形值域 0-100，消息协议波形值域 0-31，发送前必须归一化再 5-bit 打包 */
export function normalizeAndEncodeWaveform(waveform: number[]): string {
  const normalized = waveform.map((value) =>
    Math.max(0, Math.min(31, Math.round((value / 100) * 31))),
  );
  return encodeWaveformToBase64(normalized);
}

export function decodeWaveformForRender(base64: string, spikes: number): { data: number[]; peak: number } {
  const decoded = decodeWaveformFromBase64(base64);
  if (decoded.length === 0) {
    return { data: [], peak: 0 };
  }
  return interpolateArray(decoded, spikes);
}
