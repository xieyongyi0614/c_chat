import { TableConnection } from '../Table';

export interface ConversationRecord {
  id: string;
  type: number;
  target_id: string;
  last_msg_content: string;
  last_msg_time: number;
  update_time: number;
  create_time: number;
}

export class ConversationTable extends TableConnection {
  readonly TABLE_NAME = 'conversations';

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
        type INTEGER,
        target_id TEXT,
        last_msg_content TEXT,
        last_msg_time INTEGER,
        update_time INTEGER,
        create_time INTEGER
      )
    `;
    this.run(sql);
  }

  /**
   * 获取所有会话
   */
  getAllConversations(): ConversationRecord[] {
    return this.all<ConversationRecord>(`SELECT * FROM ${this.TABLE_NAME} ORDER BY last_msg_time DESC`);
  }

  /**
   * 获取单个会话
   */
  getConversation(id: string): ConversationRecord | undefined {
    return this.get<[string], ConversationRecord>(`SELECT * FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
  }

  /**
   * 插入或更新会话
   */
  upsertConversation(convo: ConversationRecord) {
    const sql = `
      INSERT INTO ${this.TABLE_NAME} (id, type, target_id, last_msg_content, last_msg_time, update_time, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_msg_content = excluded.last_msg_content,
        last_msg_time = excluded.last_msg_time,
        update_time = excluded.update_time
    `;
    this.run(sql, [
      convo.id,
      convo.type,
      convo.target_id,
      convo.last_msg_content,
      convo.last_msg_time,
      convo.update_time,
      convo.create_time,
    ]);
  }

  /**
   * 删除会话
   */
  deleteConversation(id: string) {
    this.run(`DELETE FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
  }
}
