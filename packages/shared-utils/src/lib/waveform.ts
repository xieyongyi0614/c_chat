export function decodeWaveform(encoded5bit: Uint8Array) {
  const bitsCount = encoded5bit.length * 8;
  const valuesCount = Math.floor(bitsCount / 5);
  if (!valuesCount) {
    return [];
  }

  const result = new Array<number>(valuesCount);
  const bitsData = encoded5bit;
  for (let i = 0, l = valuesCount - 1; i !== l; ++i) {
    const byteIndex = Math.floor((i * 5) / 8);
    const bitShift = Math.floor((i * 5) % 8);
    const value = bitsData[byteIndex] + (bitsData[byteIndex + 1] << 8);
    result[i] = (value >> bitShift) & 0x1f;
  }
  const lastByteIndex = Math.floor(((valuesCount - 1) * 5) / 8);
  const lastBitShift = Math.floor(((valuesCount - 1) * 5) % 8);
  const lastValue = bitsData[lastByteIndex] + (bitsData[lastByteIndex + 1] << 8);
  result[valuesCount - 1] = (lastValue >> lastBitShift) & 0x1f;

  return result;
}

export function interpolateArray(data: number[], fitCount: number) {
  let peak = 0;
  const newData = new Array(fitCount);
  const springFactor = data.length / fitCount;
  const leftFiller = data[0];
  const rightFiller = data[data.length - 1];
  for (let i = 0; i < fitCount; i++) {
    const idx = Math.floor(i * springFactor);
    const val =
      ((data[idx - 1] ?? leftFiller) + (data[idx] ?? leftFiller) + (data[idx + 1] ?? rightFiller)) /
      3;
    newData[i] = val;
    if (peak < val) {
      peak = val;
    }
  }
  return { data: newData, peak };
}

export function base64ToUint8Array(base64: string): Uint8Array {
  // Node / Electron
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  // Browser
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);

    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }

  throw new Error('No base64 decoder available');
}

export function decodeWaveformFromBase64(base64: string) {
  const packed = base64ToUint8Array(base64);

  return decodeWaveform(packed);
}

/** encode */
export function encodeWaveform(waveform: number[]): Uint8Array {
  if (!waveform.length) {
    return new Uint8Array();
  }

  const bitCount = waveform.length * 5;

  const byteCount = Math.ceil(bitCount / 8);

  const result = new Uint8Array(byteCount);

  for (let i = 0; i < waveform.length; i++) {
    // 保证只取低 5 bit
    const value = waveform[i] & 0x1f;

    const bitIndex = i * 5;

    const byteIndex = Math.floor(bitIndex / 8);

    const bitShift = bitIndex % 8;

    // 写入当前 byte
    result[byteIndex] |= value << bitShift;

    // 如果跨 byte
    if (bitShift > 3) {
      result[byteIndex + 1] |= value >> (8 - bitShift);
    }
  }

  return result;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Node / Electron
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  // Browser
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function encodeWaveformToBase64(waveform: number[]) {
  const packed = encodeWaveform(waveform);
  return uint8ArrayToBase64(packed);
}
