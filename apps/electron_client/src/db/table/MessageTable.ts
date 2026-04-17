import { LocalMessageListItem } from '@c_chat/shared-types';
import { TableConnection } from '../Table';

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
    this.run(
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ${this.TABLE_NAME} (conversation_id)`,
    );
    this.run(
      `CREATE INDEX IF NOT EXISTS idx_messages_create_time ON ${this.TABLE_NAME} (create_time)`,
    );
  }

  /**
   * 获取会话的所有消息
   */
  getMessagesByConversationId(conversationId: string, limit = 50, offset = 0) {
    const rows = this.all<LocalMessageListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE conversation_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [conversationId, limit, offset],
    );
    return rows.map(this.mapRowToRecord);
  }

  /**
   * 获取消息总数
   */
  getMessageCount(conversationId: string): number {
    const row = this.get<[string], { count: number }>(
      `SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE conversation_id = ?`,
      [conversationId],
    );
    return row?.count ?? 0;
  }

  /**
   * 获取最新的一条消息
   */
  getLastMessage(conversationId: string) {
    const row = this.get<[string], LocalMessageListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE conversation_id = ? ORDER BY create_time DESC LIMIT 1`,
      [conversationId],
    );
    return row ? this.mapRowToRecord(row) : undefined;
  }

  /**
   * 批量更新消息
   */
  upsertMessages(msgs: LocalMessageListItem[]) {
    if (msgs.length === 0) return;

    const sql = `
      INSERT INTO ${this.TABLE_NAME} (id, sender_id, conversation_id, content, type, state, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        content = excluded.content,
        update_time = excluded.update_time
    `;

    const stmt = this.db?.prepare(sql);
    const transaction = this.db?.transaction((items: LocalMessageListItem[]) => {
      for (const msg of items) {
        stmt?.run(
          msg.id,
          msg.senderId,
          msg.conversationId,
          msg.content,
          msg.type,
          msg.state,
          msg.createTime,
          msg.updateTime,
        );
      }
    });

    transaction?.(msgs);
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

  private mapRowToRecord(row: any): LocalMessageListItem {
    return {
      id: row.id,
      senderId: row.sender_id,
      conversationId: row.conversation_id,
      content: row.content,
      type: row.type,
      state: row.state,
      createTime: row.create_time,
      updateTime: row.update_time,
    };
  }
}
