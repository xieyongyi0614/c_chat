import Dexie, { type EntityTable } from 'dexie';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import type { LocalMessageListItem } from '@c_chat/shared-types';

export interface StoreItem {
  key: string;
  value: string;
}

export interface UploadTask {
  id: string;
  uploadId: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  conversationId?: string;
  clientMsgId?: string;
  messageType?: number;
  duration?: number;
  waveform?: string;
  createdAt: number;
  updatedAt: number;
}

const db = new Dexie('c_chat_web') as Dexie & {
  store: EntityTable<StoreItem, 'key'>;
  conversations: EntityTable<LocalConversationListItem, 'id'>;
  messages: EntityTable<LocalMessageListItem, 'id'>;
  uploadTasks: EntityTable<UploadTask, 'id'>;
};

db.version(1).stores({
  store: 'key',
  conversations: 'id, type, updateTime, lastMsgTime',
  messages: 'id, conversationId, seq, clientMsgId, createTime',
});

db.version(2).stores({
  store: 'key',
  conversations: 'id, type, updateTime, lastMsgTime',
  messages: 'id, conversationId, seq, clientMsgId, createTime',
  uploadTasks: 'id, uploadId, status, conversationId, createdAt',
});

export { db };

export class StoreDB {
  static async get(key: string): Promise<string | undefined> {
    const item = await db.store.get(key);
    return item?.value;
  }

  static async set(key: string, value: string): Promise<void> {
    await db.store.put({ key, value });
  }

  static async delete(key: string): Promise<void> {
    await db.store.delete(key);
  }

  static async clear(): Promise<void> {
    await db.store.clear();
  }
}

export class ConversationDB {
  static async getAll(): Promise<LocalConversationListItem[]> {
    return db.conversations.orderBy('updateTime').reverse().toArray();
  }

  static async getById(id: string): Promise<LocalConversationListItem | undefined> {
    return db.conversations.where('id').equals(id).first();
  }

  static async upsert(conversation: LocalConversationListItem): Promise<void> {
    await db.conversations.put(conversation);
  }

  static async upsertMany(conversations: LocalConversationListItem[]): Promise<void> {
    await db.conversations.bulkPut(conversations);
  }

  static async delete(id: string): Promise<void> {
    await db.conversations.where('id').equals(id).delete();
  }

  static async clear(): Promise<void> {
    await db.conversations.clear();
  }
}

export class MessageDB {
  static async getByConversation(
    conversationId: string,
    limit = 50
  ): Promise<LocalMessageListItem[]> {
    return db.messages
      .where('conversationId')
      .equals(conversationId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getById(id: string): Promise<LocalMessageListItem | undefined> {
    return db.messages.where('id').equals(id).first();
  }

  static async getByClientMsgId(clientMsgId: string): Promise<LocalMessageListItem | undefined> {
    return db.messages.where('clientMsgId').equals(clientMsgId).first();
  }

  static async upsert(message: LocalMessageListItem): Promise<void> {
    await db.messages.put(message);
  }

  static async upsertMany(messages: LocalMessageListItem[]): Promise<void> {
    await db.messages.bulkPut(messages);
  }

  static async delete(id: string): Promise<void> {
    await db.messages.where('id').equals(id).delete();
  }

  static async deleteByConversation(conversationId: string): Promise<void> {
    await db.messages.where('conversationId').equals(conversationId).delete();
  }

  static async clear(): Promise<void> {
    await db.messages.clear();
  }
}

export class UploadTaskDB {
  static async getAll(): Promise<UploadTask[]> {
    return db.uploadTasks.orderBy('createdAt').reverse().toArray();
  }

  static async getById(id: string): Promise<UploadTask | undefined> {
    return db.uploadTasks.where('id').equals(id).first();
  }

  static async getByUploadId(uploadId: string): Promise<UploadTask | undefined> {
    return db.uploadTasks.where('uploadId').equals(uploadId).first();
  }

  static async getByStatus(status: UploadTask['status']): Promise<UploadTask[]> {
    return db.uploadTasks.where('status').equals(status).toArray();
  }

  static async upsert(task: UploadTask): Promise<void> {
    await db.uploadTasks.put(task);
  }

  static async updateStatus(
    id: string,
    status: UploadTask['status'],
    uploadedChunks?: number[]
  ): Promise<void> {
    const task = await db.uploadTasks.get(id);
    if (task) {
      task.status = status;
      task.updatedAt = Date.now();
      if (uploadedChunks) {
        task.uploadedChunks = uploadedChunks;
      }
      await db.uploadTasks.put(task);
    }
  }

  static async delete(id: string): Promise<void> {
    await db.uploadTasks.where('id').equals(id).delete();
  }

  static async clear(): Promise<void> {
    await db.uploadTasks.clear();
  }
}
