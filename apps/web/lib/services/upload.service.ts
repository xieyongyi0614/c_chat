import { uploadService } from '../api/client';
import { UploadTaskDB, MessageDB, type UploadTask } from '../db';
import { useMessageStore } from '../stores/message.store';
import { MessageStatus } from '@c_chat/shared-types';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import {
  UPLOAD_CHUNK_SIZE,
  MESSAGE_TYPE,
  messageTypeMap,
  EXTENSION_TO_TYPE_MAP,
  type MessageType,
} from '@c_chat/shared-config';

const CHUNK_UPLOAD_CONCURRENCY = 4;
const SAMPLE_SIZE = 256 * 1024;

/** 与桌面端 calcSamplingHash 对齐：头/中/尾各采样 256KB + size，SHA-256 */
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

function resolveMessageType(file: File): MessageType {
  const dotIndex = file.name.lastIndexOf('.');
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
  const fileType = EXTENSION_TO_TYPE_MAP[ext];
  if (fileType) return messageTypeMap[fileType];

  if (file.type.startsWith('image/')) return MESSAGE_TYPE.Image;
  if (file.type.startsWith('video/')) return MESSAGE_TYPE.Video;
  if (file.type.startsWith('audio/')) return MESSAGE_TYPE.Audio;
  return MESSAGE_TYPE.File;
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

export interface StartUploadParams {
  file: File;
  conversationId: string;
}

export class UploadManager {
  /** 选择文件后创建 pending 消息 + 上传任务，并异步执行上传 */
  async upload({ file, conversationId }: StartUploadParams): Promise<void> {
    const clientMsgId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const messageType = resolveMessageType(file);
    const objectUrl = URL.createObjectURL(file);

    const pendingMessage: LocalMessageListItem = {
      id: clientMsgId,
      conversationId,
      seq: BigInt(0),
      clientMsgId,
      senderId: '',
      content: '',
      type: messageType,
      status: MessageStatus.uploading,
      updateTime: Date.now(),
      createTime: Date.now(),
      localTime: Date.now(),
      fileUrl: objectUrl,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      progress: 0,
    };

    await MessageDB.upsert(pendingMessage);
    useMessageStore.getState().upsertMany(conversationId, [pendingMessage]);

    const fileHash = await calcSamplingHash(file);
    const chunkSize = UPLOAD_CHUNK_SIZE;
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

    const task: UploadTask = {
      id: clientMsgId,
      uploadId: '',
      fileName: file.name,
      fileSize: file.size,
      fileHash,
      chunkSize,
      totalChunks,
      uploadedChunks: [],
      status: 'pending',
      conversationId,
      clientMsgId,
      messageType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await UploadTaskDB.upsert(task);

    await this.runUpload(task, file, objectUrl);
  }

  /** 刷新后重试：File 对象已丢失，提示用户重新选择同一文件 */
  async retry(taskId: string, file: File): Promise<void> {
    const task = await UploadTaskDB.getById(taskId);
    if (!task || !task.conversationId) return;

    await this.updateMessageStatus(task.clientMsgId, MessageStatus.uploading);
    const objectUrl = URL.createObjectURL(file);
    await this.runUpload(task, file, objectUrl);
  }

  private async runUpload(task: UploadTask, file: File, objectUrl: string): Promise<void> {
    try {
      await UploadTaskDB.updateStatus(task.id, 'uploading');

      const initRes = await uploadService.uploadInit({
        fileName: task.fileName,
        fileSize: task.fileSize,
        fileHash: task.fileHash,
        chunkSize: task.chunkSize,
        mimeType: file.type,
        clientMsgId: task.clientMsgId,
        conversationId: task.conversationId,
        messageType: task.messageType,
      });

      if (!initRes) {
        throw new Error('上传初始化失败');
      }

      // 秒传：服务端命中已存在文件，直接 complete 由服务端建消息
      if (initRes.file) {
        await UploadTaskDB.updateStatus(task.id, 'completed');
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const session = initRes.uploadSession;
      if (!session) {
        throw new Error('上传会话创建失败');
      }

      const uploadId = session.id;
      const chunkSize = Number(session.chunkSize ?? task.chunkSize);
      const totalChunks = Math.max(1, Number(session.totalChunks ?? task.totalChunks));
      await UploadTaskDB.upsert({ ...task, uploadId });

      const statusRes = await uploadService.getUploadStatus(uploadId);
      const uploadedIndices = new Set<number>(statusRes?.uploadedChunks ?? []);

      const missing: number[] = [];
      for (let index = 0; index < totalChunks; index++) {
        if (!uploadedIndices.has(index)) missing.push(index);
      }

      await this.persistProgress(task, uploadedIndices, totalChunks);

      await runChunkPool(missing, CHUNK_UPLOAD_CONCURRENCY, async (index) => {
        const start = index * chunkSize;
        const chunk = file.slice(start, start + chunkSize);
        const chunkRes = await uploadService.uploadChunk({
          uploadId,
          chunkIndex: index,
          chunk,
          fileName: task.fileName,
          totalChunks,
          fileSize: task.fileSize,
        });

        if (!chunkRes?.ok) {
          throw new Error('分片上传失败');
        }

        uploadedIndices.add(index);
        await this.persistProgress(task, uploadedIndices, totalChunks);
      });

      const completeRes = await uploadService.uploadComplete({ uploadId, usage: 'message' });
      if (!completeRes?.queued && !completeRes?.file) {
        throw new Error('触发合并失败');
      }

      // 方案 B：不二次 sendMessage，等待服务端 newUpdateMessage 覆盖 pending
      await UploadTaskDB.updateStatus(task.id, 'completed');
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('[UploadManager] runUpload error:', error);
      await UploadTaskDB.updateStatus(task.id, 'failed');
      await this.updateMessageStatus(task.clientMsgId, MessageStatus.fail);
      URL.revokeObjectURL(objectUrl);
    }
  }

  private async persistProgress(
    task: UploadTask,
    uploadedIndices: Set<number>,
    totalChunks: number,
  ): Promise<void> {
    await UploadTaskDB.updateStatus(task.id, 'uploading', [...uploadedIndices]);

    const message = await MessageDB.getByClientMsgId(task.clientMsgId ?? '');
    if (message) {
      message.progress = Math.floor((uploadedIndices.size / totalChunks) * 100);
      await MessageDB.upsert(message);
      useMessageStore.getState().upsertMany(message.conversationId, [message]);
    }
  }

  private async updateMessageStatus(
    clientMsgId: string | undefined,
    status: MessageStatus,
  ): Promise<void> {
    if (!clientMsgId) return;
    const message = await MessageDB.getByClientMsgId(clientMsgId);
    if (message) {
      message.status = status;
      await MessageDB.upsert(message);
      useMessageStore.getState().upsertMany(message.conversationId, [message]);
    }
  }
}

export const uploadManager = new UploadManager();
