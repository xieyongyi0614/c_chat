import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import { messageTableClass, uploadTaskTableClass } from '../db';
import { to } from '@c_chat/shared-utils';
import {
  MessageStatusEnum,
  MessageTypeEnum,
  UploadStatusEnum,
  UploadTypes,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { SendMessageRequest } from '@c_chat/shared-protobuf';
import { UPLOAD_CHUNK_SIZE } from '@c_chat/shared-config';
import { ApiClient } from './axios/service/apiService';
import { readChunkAsBlob } from './calcFileHash';

/** 与服务端 ChunkService + 合并队列搭配的并发度（分片已按序号落盘，可并行上传） */
const CHUNK_UPLOAD_CONCURRENCY = 4;
const MERGE_POLL_MS = 400;
const MERGE_POLL_TIMEOUT_MS = 120_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * 固定并发池：多个 worker 抢同一个游标，避免重复/遗漏下标。
 */
async function runChunkPool(
  indices: number[],
  concurrency: number,
  worker: (chunkIndex: number) => Promise<void>,
): Promise<void> {
  if (indices.length === 0) return;
  const n = Math.min(concurrency, indices.length);
  let next = 0;
  const runWorker = async () => {
    while (true) {
      const i = next++;
      if (i >= indices.length) return;
      await worker(indices[i]);
    }
  };
  await Promise.all(Array.from({ length: n }, () => runWorker()));
}

/** WebSocket 发送带附件的消息（与 SendMessage IPC 一致） */
export async function sendSocketMessageWithFile(
  windowId: number,
  payload: {
    conversationId: string;
    clientMsgId: string;
    fileId: string;
    type: MessageTypeEnum;
    mediaGroupId?: string;
    content?: string;
  },
) {
  const socketService = socketManager.getSocketService(windowId);
  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.sendMessage,
      SendMessageRequest.encode(
        SendMessageRequest.create({
          conversationId: payload.conversationId,
          content: payload.content ?? '',
          type: payload.type,
          clientMsgId: payload.clientMsgId,
          mediaGroupId: payload.mediaGroupId,
          fileId: payload.fileId,
        }),
      ).finish(),
    ),
  );
  if (err || res.status !== 'ok') {
    throw err || new Error('发送消息失败');
  }
}

/**
 * 分片上传并在完成后通过 Socket 发送消息。
 * 须先写入本地 message，再触发本函数（异步）。
 *
 * 对接 `c_chat_service/src/modules/upload`：分片文件名为 `{chunkIndex}.chunk`（从 0 起），
 * 全部上传后需调用 complete，合并完成后 DB 中 fileHash 与 init 时一致（采样 hash），
 * 用 getFileByHash(采样, size) 取 fileId，无需再算全文件 SHA256。
 */
export async function startUpload(
  taskId: string,
  windowId: number,
  uploadSession?: NonNullable<UploadTypes.PostUploadInitResponse['uploadSession']>,
) {
  const task = uploadTaskTableClass.getByTaskId(taskId);
  if (!task?.filePath || !task.uploadSessionId) return;

  const effectiveWindowId = task.windowId ?? windowId;

  const session =
    uploadSession ??
    ({
      id: task.uploadSessionId,
      chunkSize: task.chunkSize ?? UPLOAD_CHUNK_SIZE,
      totalChunks: task.totalChunks,
      fileSize: task.fileSize,
    } as NonNullable<UploadTypes.PostUploadInitResponse['uploadSession']>);

  const chunkSize = Number(session.chunkSize ?? UPLOAD_CHUNK_SIZE);
  const totalChunks = Math.max(1, Number(session.totalChunks));

  try {
    uploadTaskTableClass.updateStatus(taskId, UploadStatusEnum.uploading);

    const statusRes = await ApiClient.upload.getUploadStatus(task.uploadSessionId);
    const serverIndices = new Set(statusRes?.uploadedChunks ?? []);

    const missing: number[] = [];
    for (let idx = 0; idx < totalChunks; idx++) {
      if (!serverIndices.has(idx)) missing.push(idx);
    }

    let finishedCount = totalChunks - missing.length;

    await runChunkPool(missing, CHUNK_UPLOAD_CONCURRENCY, async (idx) => {
      const blob = await readChunkAsBlob(task.filePath, idx, chunkSize);
      const chunkRes = await ApiClient.upload.uploadChunk({
        uploadId: session.id,
        chunkIndex: idx,
        chunk: blob,
        fileName: task.fileName,
        totalChunks,
        fileSize: task.fileSize,
      });

      if (!chunkRes?.ok) {
        throw new Error('分片上传失败');
      }

      finishedCount++;
      uploadTaskTableClass.updateChunkProgress(taskId, finishedCount);
      const uploadedBytes = Math.min(
        Math.round((finishedCount / totalChunks) * task.fileSize),
        task.fileSize,
      );
      uploadTaskTableClass.updateProgress(
        taskId,
        Math.floor((finishedCount / totalChunks) * 100),
        uploadedBytes,
      );
    });

    const completeRes = await ApiClient.upload.uploadComplete({ uploadId: session.id });
    if (!completeRes?.queued) {
      throw new Error('触发合并失败');
    }

    /** 合并异步：File 记录使用 session 的 fileHash（与 init 时采样 hash 一致） */
    const fingerprintHash = task.fileHash;
    let fileId: string | undefined;
    const deadline = Date.now() + MERGE_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const hit = await ApiClient.upload.getFileByHash({
        fileHash: fingerprintHash,
        size: task.fileSize,
      });
      if (hit?.id) {
        fileId = hit.id;
        break;
      }
      await sleep(MERGE_POLL_MS);
    }

    if (!fileId) {
      throw new Error('合并超时或未解析到 fileId');
    }

    uploadTaskTableClass.setFileId(taskId, fileId);
    uploadTaskTableClass.updateStatus(taskId, UploadStatusEnum.success);

    messageTableClass.updateFileIdByClientId(task.clientMsgId, fileId);

    const msg = messageTableClass.getByClientMsgId(task.clientMsgId);
    if (!msg) {
      throw new Error('本地消息不存在');
    }

    const [sendErr] = await to(
      sendSocketMessageWithFile(effectiveWindowId, {
        conversationId: msg.conversationId,
        clientMsgId: msg.clientMsgId,
        fileId,
        type: msg.type,
        mediaGroupId: msg.mediaGroupId || undefined,
        content: msg.content,
      }),
    );

    if (sendErr) {
      throw sendErr;
    }
  } catch (e) {
    console.error('startUpload error:', e);

    uploadTaskTableClass.updateStatus(taskId, UploadStatusEnum.fail);

    if (task.clientMsgId) {
      messageTableClass.updateMessageStateByClientId(task.clientMsgId, MessageStatusEnum.fail);
    }
  }
}
