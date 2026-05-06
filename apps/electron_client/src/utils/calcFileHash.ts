import fs from 'fs';
import crypto from 'crypto';

const SAMPLE_SIZE = 256 * 1024; // 256KB

export function calcSamplingHash(filePath: string) {
  const stat = fs.statSync(filePath);
  const size = stat.size;

  const fd = fs.openSync(filePath, 'r');

  const hash = crypto.createHash('sha256');

  function readChunk(position: number) {
    if (position < 0) position = 0;

    const remaining = size - position;
    const length = Math.min(SAMPLE_SIZE, remaining);

    if (length <= 0) return;

    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, position);
    hash.update(buffer);
  }

  if (size <= SAMPLE_SIZE * 3) {
    const buffer = fs.readFileSync(filePath);
    hash.update(buffer);
  } else {
    // 头
    readChunk(0);

    // 中
    readChunk(Math.floor(size / 2));

    // 尾
    readChunk(size - SAMPLE_SIZE);
  }

  hash.update(String(size));

  fs.closeSync(fd);

  return hash.digest('hex');
}

interface CalcHashOptions {
  onProgress?: (percent: number, processedBytes: number, totalBytes: number) => void;
}

export function calcFileHashWithProgress(
  filePath: string,
  options?: CalcHashOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const totalSize = stat.size;

    let processed = 0;

    const hash = crypto.createHash('sha256');

    const stream = fs.createReadStream(filePath, {
      highWaterMark: 4 * 1024 * 1024, // 4MB
    });

    stream.on('data', (chunk) => {
      hash.update(chunk);

      processed += chunk.length;

      if (options?.onProgress) {
        options.onProgress(Math.floor((processed / totalSize) * 100), processed, totalSize);
      }
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', reject);
  });
}

export async function readChunkAsBlob(
  filePath: string,
  chunkIndex: number,
  chunkSize: number,
): Promise<Blob> {
  const start = chunkIndex * chunkSize;
  const end = start + chunkSize;

  const stream = fs.createReadStream(filePath, {
    start,
    end: end - 1, // 注意：end 是包含的
  });

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }

  const buffer = Buffer.concat(chunks);

  // Node 18+ 支持 Blob
  return new Blob([buffer]);
}
