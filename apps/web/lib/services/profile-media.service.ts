import { uploadFileWithPipeline } from '@c_chat/shared-api';
import { uploadService } from '../api/client';

const SAMPLE_SIZE = 256 * 1024;

async function calcSamplingHash(file: File): Promise<string> {
  const size = file.size;
  const parts: Blob[] = [];

  if (size <= SAMPLE_SIZE * 3) {
    parts.push(file);
  } else {
    parts.push(file.slice(0, SAMPLE_SIZE));
    const mid = Math.floor(size / 2);
    parts.push(file.slice(mid, mid + SAMPLE_SIZE));
    parts.push(file.slice(size - SAMPLE_SIZE, size));
  }

  parts.push(new Blob([String(size)]));

  const buffer = await new Blob(parts).arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function uploadProfileImage(file: File): Promise<string> {
  const uploadedFile = await uploadFileWithPipeline({
    uploadService,
    fileName: file.name,
    fileSize: file.size,
    fileHash: await calcSamplingHash(file),
    mimeType: file.type,
    usage: 'file',
    readChunk: async (index, chunkSize) => {
      const start = index * chunkSize;
      return file.slice(start, start + chunkSize);
    },
  });

  return uploadedFile.url;
}
