import { UPLOAD_CHUNK_SIZE } from '@c_chat/shared-config';
import type { UploadTypes } from '@c_chat/shared-types';
import type { UploadService } from './uploadService';

const DEFAULT_CHUNK_UPLOAD_CONCURRENCY = 4;

interface UploadChunkSource {
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  readChunk: (chunkIndex: number, chunkSize: number) => Promise<Blob>;
}

export interface UploadFilePipelineParams {
  uploadService: UploadService;
  fileName: string;
  fileSize: number;
  fileHash: string;
  mimeType?: string;
  readChunk: (chunkIndex: number, chunkSize: number) => Promise<Blob>;
  usage?: UploadTypes.UploadCompleteUsage;
  initContext?: Pick<
    UploadTypes.PostUploadInitParams,
    | 'clientMsgId'
    | 'conversationId'
    | 'messageType'
    | 'mediaGroupId'
    | 'content'
    | 'duration'
    | 'waveform'
  >;
  onUploadId?: (uploadId: string) => Promise<void> | void;
  onProgress?: (progress: {
    uploadedChunks: number[];
    uploadedCount: number;
    totalChunks: number;
    percent: number;
  }) => Promise<void> | void;
}

export interface CompleteUploadSessionParams extends UploadChunkSource {
  uploadService: UploadService;
  uploadId: string;
  usage?: UploadTypes.UploadCompleteUsage;
  onProgress?: UploadFilePipelineParams['onProgress'];
}

async function runChunkPool(
  indices: number[],
  concurrency: number,
  worker: (chunkIndex: number) => Promise<void>,
): Promise<void> {
  if (indices.length === 0) return;

  const workerCount = Math.min(concurrency, indices.length);
  let cursor = 0;

  const runWorker = async () => {
    while (cursor < indices.length) {
      const index = indices[cursor++];
      await worker(index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

async function notifyProgress(
  uploadedIndices: Set<number>,
  totalChunks: number,
  onProgress: UploadFilePipelineParams['onProgress'],
) {
  if (!onProgress) return;

  const uploadedChunks = [...uploadedIndices].sort((a, b) => a - b);
  await onProgress({
    uploadedChunks,
    uploadedCount: uploadedChunks.length,
    totalChunks,
    percent: Math.floor((uploadedChunks.length / totalChunks) * 100),
  });
}

export async function completeUploadSession({
  uploadService,
  uploadId,
  fileName,
  fileSize,
  chunkSize,
  totalChunks,
  readChunk,
  usage = 'file',
  onProgress,
}: CompleteUploadSessionParams): Promise<UploadTypes.GetFileByHashResponse> {
  const statusRes = await uploadService.getUploadStatus(uploadId);
  const uploadedIndices = new Set<number>(statusRes?.uploadedChunks ?? []);

  const missing: number[] = [];
  for (let index = 0; index < totalChunks; index++) {
    if (!uploadedIndices.has(index)) missing.push(index);
  }

  await notifyProgress(uploadedIndices, totalChunks, onProgress);

  await runChunkPool(missing, DEFAULT_CHUNK_UPLOAD_CONCURRENCY, async (index) => {
    const chunk = await readChunk(index, chunkSize);
    const chunkRes = await uploadService.uploadChunk({
      uploadId,
      chunkIndex: index,
      chunk,
      fileName,
      totalChunks,
      fileSize,
    });

    if (!chunkRes?.ok) {
      throw new Error('Upload chunk failed');
    }

    uploadedIndices.add(index);
    await notifyProgress(uploadedIndices, totalChunks, onProgress);
  });

  const completeRes = await uploadService.uploadComplete({ uploadId, usage });
  if (!completeRes?.file) {
    throw new Error('Upload complete failed');
  }

  return completeRes.file;
}

export async function uploadFileWithPipeline({
  uploadService,
  fileName,
  fileSize,
  fileHash,
  mimeType,
  readChunk,
  usage = 'file',
  initContext,
  onUploadId,
  onProgress,
}: UploadFilePipelineParams): Promise<UploadTypes.GetFileByHashResponse> {
  const initRes = await uploadService.uploadInit({
    fileName,
    fileSize,
    fileHash,
    chunkSize: UPLOAD_CHUNK_SIZE,
    mimeType,
    ...initContext,
  });

  if (!initRes) {
    throw new Error('Upload init failed');
  }

  if (initRes.file) {
    return initRes.file;
  }

  const session = initRes.uploadSession;
  if (!session?.id) {
    throw new Error('Upload session missing');
  }

  await onUploadId?.(session.id);

  const chunkSize = Number(session.chunkSize ?? UPLOAD_CHUNK_SIZE);
  const totalChunks = Math.max(1, Number(session.totalChunks ?? Math.ceil(fileSize / chunkSize)));

  return completeUploadSession({
    uploadService,
    uploadId: session.id,
    fileName,
    fileSize,
    chunkSize,
    totalChunks,
    readChunk,
    usage,
    onProgress,
  });
}
