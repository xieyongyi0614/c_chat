import fs from 'fs';
import crypto from 'crypto';

const SAMPLE_SIZE = 256 * 1024; // 256KB

export function calcSamplingHash(filePath: string) {
  const stat = fs.statSync(filePath);
  const size = stat.size;

  const fd = fs.openSync(filePath, 'r');

  const head = Buffer.alloc(SAMPLE_SIZE);
  const middle = Buffer.alloc(SAMPLE_SIZE);
  const tail = Buffer.alloc(SAMPLE_SIZE);

  // 头
  fs.readSync(fd, head, 0, SAMPLE_SIZE, 0);

  // 中
  const middlePos = Math.floor(size / 2);
  fs.readSync(fd, middle, 0, SAMPLE_SIZE, middlePos);

  // 尾
  const tailPos = size - SAMPLE_SIZE;
  fs.readSync(fd, tail, 0, SAMPLE_SIZE, tailPos);

  fs.closeSync(fd);

  const hash = crypto.createHash('sha256');
  hash.update(head);
  hash.update(middle);
  hash.update(tail);
  hash.update(String(size));

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
