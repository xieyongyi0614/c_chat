import { uploadService } from '../api/client';
import { MessageDB, UploadTaskDB, type UploadTask } from '../db';
import { useMessageStore } from '../stores/message.store';
import { useUserStore } from '../stores/user.store';
import { uploadFileWithPipeline } from '@c_chat/shared-api';
import { MessageStatus } from '@c_chat/shared-types';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import {
  EXTENSION_TO_TYPE_MAP,
  MESSAGE_TYPE,
  UPLOAD_CHUNK_SIZE,
  messageTypeMap,
  type MessageType,
} from '@c_chat/shared-config';
import { messageService } from './message.service';

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

export interface StartUploadParams {
  file: File;
  conversationId: string;
  duration?: number;
  waveform?: string;
  messageType?: MessageType;
}

export class UploadManager {
  async upload({
    file,
    conversationId,
    duration,
    waveform,
    messageType: explicitType,
  }: StartUploadParams): Promise<void> {
    const clientMsgId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const messageType = explicitType ?? resolveMessageType(file);
    const objectUrl = URL.createObjectURL(file);
    const userInfo = useUserStore.getState().userInfo;

    const pendingMessage: LocalMessageListItem = {
      id: clientMsgId,
      conversationId,
      seq: BigInt(0),
      clientMsgId,
      senderId: userInfo?.id ?? '',
      senderNickname: userInfo?.nickname ?? userInfo?.email ?? '',
      senderAvatar: userInfo?.avatarUrl ?? '',
      senderEmail: userInfo?.email ?? '',
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
      duration,
      waveform,
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
      duration,
      waveform,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await UploadTaskDB.upsert(task);

    void this.runUpload(task, file, objectUrl);
  }

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

      const uploadedFile = await uploadFileWithPipeline({
        uploadService,
        fileName: task.fileName,
        fileSize: task.fileSize,
        fileHash: task.fileHash,
        mimeType: file.type,
        usage: 'file',
        initContext: {
          clientMsgId: task.clientMsgId,
          conversationId: task.conversationId,
          messageType: task.messageType,
          duration: task.duration,
          waveform: task.waveform,
        },
        readChunk: async (index, chunkSize) => {
          const start = index * chunkSize;
          return file.slice(start, start + chunkSize);
        },
        onUploadId: async (uploadId) => {
          await UploadTaskDB.upsert({ ...task, uploadId });
        },
        onProgress: async ({ uploadedChunks, totalChunks }) => {
          await this.persistProgress(task, uploadedChunks, totalChunks);
        },
      });

      await this.sendUploadedFileMessage(task, uploadedFile.id, uploadedFile.url);
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
    uploadedChunks: number[],
    totalChunks: number,
  ): Promise<void> {
    await UploadTaskDB.updateStatus(task.id, 'uploading', uploadedChunks);

    const message = await MessageDB.getByClientMsgId(task.clientMsgId ?? '');
    if (message) {
      message.progress = Math.floor((uploadedChunks.length / totalChunks) * 100);
      await MessageDB.upsert(message);
      useMessageStore.getState().upsertMany(message.conversationId, [message]);
    }
  }

  private async sendUploadedFileMessage(
    task: UploadTask,
    fileId: string,
    fileUrl: string,
  ): Promise<void> {
    const message = await MessageDB.getByClientMsgId(task.clientMsgId ?? '');
    if (message) {
      message.fileId = fileId;
      message.fileUrl = fileUrl;
      message.status = MessageStatus.sending;
      message.progress = 100;
      await MessageDB.upsert(message);
      useMessageStore.getState().upsertMany(message.conversationId, [message]);
    }

    await messageService.sendMessage({
      conversationId: task.conversationId,
      content: '',
      clientMsgId: task.clientMsgId,
      type: task.messageType,
      fileId,
      fileUrl,
      fileName: task.fileName,
      fileSize: task.fileSize,
      duration: task.duration,
      waveform: task.waveform,
    });
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
