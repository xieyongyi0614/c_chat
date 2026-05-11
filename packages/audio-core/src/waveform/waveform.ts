import { MAX_WAVEFORM_COUNT } from '../constants/audio';

export function compressWaveform(waveform: number[], target = MAX_WAVEFORM_COUNT) {
  if (waveform.length <= target) {
    return waveform;
  }

  const blockSize = Math.floor(waveform.length / target);

  const result: number[] = [];

  for (let i = 0; i < target; i++) {
    const start = i * blockSize;

    const end = start + blockSize;

    const slice = waveform.slice(start, end);

    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;

    result.push(Math.floor(avg));
  }

  return result;
}
