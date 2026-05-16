export function decodeWaveform(bytes: Uint8Array): number[] {
  const result: number[] = [];

  const totalBits = bytes.length * 8;

  const count = Math.floor(totalBits / 5);

  let bitOffset = 0;

  for (let i = 0; i < count; i++) {
    const byteIndex = bitOffset >> 3;

    const bitIndex = bitOffset & 7;

    let value = (bytes[byteIndex] >> bitIndex) & 0x1f;

    /**
     * 跨字节
     */
    if (bitIndex > 3) {
      value |= (bytes[byteIndex + 1] << (8 - bitIndex)) & 0x1f;
    }

    result.push(value);

    bitOffset += 5;
  }

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

  let bitOffset = 0;

  for (const raw of waveform) {
    const value = Math.max(0, Math.min(31, raw | 0));

    const byteIndex = bitOffset >> 3;
    const bitIndex = bitOffset & 7;

    result[byteIndex] |= (value << bitIndex) & 0xff;

    if (bitIndex > 3) {
      result[byteIndex + 1] |= value >> (8 - bitIndex);
    }

    bitOffset += 5;
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
