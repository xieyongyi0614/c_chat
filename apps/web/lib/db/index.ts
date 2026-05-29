import Dexie, { type EntityTable } from 'dexie';
import type { LocalConversationListItem } from '@c_chat/shared-types';
import type { LocalMessageListItem } from '@c_chat/shared-types';

export interface StoreItem {
  key: string;
  value: string;
}

const db = new Dexie('c_chat_web') as Dexie & {
  store: EntityTable<StoreItem, 'key'>;
  conversations: EntityTable<LocalConversationListItem, 'id'>;
  messages: EntityTable<LocalMessageListItem, 'id'>;
};

db.version(1).stores({
  store: 'key',
  conversations: 'id, type, updateTime, lastMsgTime',
  messages: 'id, conversationId, seq, clientMsgId, createTime',
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
