import { TableConnection } from '../Table';

export interface MessageRecord {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  type: number;
  state: number; // 0: success, 1: sending, 2: fail
  create_time: number;
  update_time: number;
}

export class MessageTable extends TableConnection {
  readonly TABLE_NAME = 'messages';

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        conversation_id TEXT,
        content TEXT,
        type INTEGER,
        state INTEGER DEFAULT 0,
        create_time INTEGER,
        update_time INTEGER
      )
    `;
    this.run(sql);
    // 建立索引
    this.run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ${this.TABLE_NAME} (conversation_id)`);
    this.run(`CREATE INDEX IF NOT EXISTS idx_messages_create_time ON ${this.TABLE_NAME} (create_time)`);
  }

  /**
   * 获取会话的所有消息
   */
  getMessagesByConversationId(conversationId: string, limit = 50, offset = 0): MessageRecord[] {
    return this.all<MessageRecord>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE conversation_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );
  }

  /**
   * 获取最新的一条消息
   */
  getLastMessage(conversationId: string): MessageRecord | undefined {
    return this.get<[string], MessageRecord>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE conversation_id = ? ORDER BY create_time DESC LIMIT 1`,
      [conversationId]
    );
  }

  /**
   * 插入消息
   */
  upsertMessage(msg: MessageRecord) {
    const sql = `
      INSERT INTO ${this.TABLE_NAME} (id, sender_id, conversation_id, content, type, state, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        content = excluded.content,
        update_time = excluded.update_time
    `;
    this.run(sql, [
      msg.id,
      msg.sender_id,
      msg.conversation_id,
      msg.content,
      msg.type,
      msg.state,
      msg.create_time,
      msg.update_time,
    ]);
  }

  /**
   * 更新消息状态
   */
  updateMessageState(id: string, state: number) {
    this.run(`UPDATE ${this.TABLE_NAME} SET state = ? WHERE id = ?`, [state, id]);
  }

  /**
   * 删除消息
   */
  deleteMessage(id: string) {
    this.run(`DELETE FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
  }
}
