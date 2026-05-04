import { LocalMessageListItem, MessageStatusEnum } from '@c_chat/shared-types';
import { TableConnection } from '../Table';
import { DEFAULT_MESSAGE_PAGE_SIZE } from '@c_chat/shared-config';

export class MessageTable extends TableConnection {
  readonly TABLE_NAME = 'messages';

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        msg_id INTEGER,              
        client_msg_id TEXT,           
        sender_id TEXT,
        content TEXT,
        type INTEGER DEFAULT 0,
        status INTEGER DEFAULT 0, 
        create_time INTEGER,          
        update_time INTEGER,  
        local_time INTEGER,
        file_id TEXT,
        file_url TEXT,
        media_group_id TEXT,
        UNIQUE(conversation_id, msg_id),
        UNIQUE(conversation_id, client_msg_id)
      )
    `;
    this.run(sql);

    // 🚀 核心索引（最重要）
    this.run(`
      CREATE INDEX IF NOT EXISTS idx_msg_conversation_msgid
      ON ${this.TABLE_NAME}(conversation_id, msg_id DESC)
    `);

    // 🚀 本地排序优化（秒开）
    this.run(`
      CREATE INDEX IF NOT EXISTS idx_msg_conversation_local_time
      ON ${this.TABLE_NAME}(conversation_id, local_time DESC)
    `);

    // 🚀 clientMsgId 查找（ACK/对齐用）
    this.run(`
      CREATE INDEX IF NOT EXISTS idx_msg_client_msg_id
      ON ${this.TABLE_NAME}(client_msg_id)
    `);
  }

  getMessagesByConversationId(
    conversationId: string,
    limit = DEFAULT_MESSAGE_PAGE_SIZE,
    beforeMsgId?: number,
  ) {
    let rows;

    if (beforeMsgId) {
      // 向上翻历史
      rows = this.all<LocalMessageListItem>(
        `
        SELECT * FROM ${this.TABLE_NAME}
        WHERE conversation_id = ?
          AND msg_id < ?
        ORDER BY msg_id DESC
        LIMIT ?
        `,
        [conversationId, beforeMsgId, limit],
      );
    } else {
      // 首次加载
      rows = this.all<LocalMessageListItem>(
        `
        SELECT * FROM ${this.TABLE_NAME}
        WHERE conversation_id = ?
        ORDER BY msg_id DESC
        LIMIT ?
        `,
        [conversationId, limit],
      );
    }

    // return rows.map(this.mapRowToRecord);
    // return this._camelcaseKeysByRows<LocalMessageListItem>(rows);
    return rows;
  }
  /**
   * 获取最新的一条消息
   */
  getLastMessage(conversationId: string) {
    const row = this.get<[string], LocalMessageListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE conversation_id = ? ORDER BY create_time DESC LIMIT 1`,
      [conversationId],
    );
    // return row ? this._camelcaseKeysByRow<LocalMessageListItem>(row) : undefined;
    return row;
  }

  getByClientMsgId(clientMsgId: string) {
    return this.get<[string], LocalMessageListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE client_msg_id = ? LIMIT 1`,
      [clientMsgId],
    );
  }
  insert(msg: LocalMessageListItem) {
    // 🚀 SQLite UPSERT（关键）
    const sql = `
  INSERT INTO ${this.TABLE_NAME} (
    id,
    conversation_id,
    msg_id,
    client_msg_id,
    sender_id,
    content,
    type,
    status,
    create_time,
    update_time,
    local_time,
    file_id,
    file_url,
    media_group_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const {
      id,
      conversationId,
      msgId,
      clientMsgId,
      senderId,
      content,
      type,
      status,
      updateTime,
      createTime,
      localTime,
      fileId,
      fileUrl,
      mediaGroupId,
    } = msg;
    this?.run(sql, [
      id,
      conversationId,
      msgId,
      clientMsgId,
      senderId,
      content,
      type,
      status,
      updateTime,
      createTime,
      localTime,
      fileId,
      fileUrl,
      mediaGroupId,
    ]);
  }

  /**
   * 批量更新消息
   */
  upsertMessages(msgs: LocalMessageListItem[]) {
    if (msgs.length === 0) return;

    // 🚀 SQLite UPSERT（关键）
    const sql = `
    INSERT INTO ${this.TABLE_NAME} (
      id,
      conversation_id,
      msg_id,
      client_msg_id,
      sender_id,
      content,
      type,
      status,
      update_time,
      create_time,
      local_time,
      file_id,
      file_url,
      media_group_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    ON CONFLICT(conversation_id, client_msg_id) DO UPDATE SET
      msg_id = excluded.msg_id,
      status = excluded.status,
      create_time = COALESCE(excluded.create_time, messages.create_time),
      update_time = COALESCE(excluded.update_time, messages.update_time),
      content = COALESCE(excluded.content, messages.content),
      file_id = COALESCE(excluded.file_id, messages.file_id),
      file_url = COALESCE(excluded.file_url, messages.file_url),
      media_group_id = COALESCE(excluded.media_group_id, messages.media_group_id)

    ON CONFLICT(conversation_id, msg_id) DO UPDATE SET
      client_msg_id = COALESCE(excluded.client_msg_id, messages.client_msg_id),
      status = excluded.status,
      content = COALESCE(excluded.content, messages.content)
  `;

    const transaction = this.db?.transaction((items: LocalMessageListItem[]) => {
      for (const msg of items) {
        const {
          id,
          conversationId,
          msgId,
          clientMsgId,
          senderId,
          content,
          type,
          status,
          updateTime,
          createTime,
          localTime,
          fileId,
          fileUrl,
          mediaGroupId,
        } = msg;
        this?.run(sql, [
          id,
          conversationId,
          msgId,
          clientMsgId,
          senderId,
          content,
          type,
          status,
          updateTime,
          createTime,
          localTime,
          fileId,
          fileUrl,
          mediaGroupId,
        ]);
      }
    });

    transaction?.(msgs);
  }

  /**
   * 更新发送状态
   */
  updateMessageStatus(id: string, status: MessageStatusEnum) {
    this.run(`UPDATE ${this.TABLE_NAME} SET status = ? WHERE id = ?`, [status, id]);
  }

  updateMessageStateByClientId(clientMsgId: string, status: MessageStatusEnum) {
    this.run(`UPDATE ${this.TABLE_NAME} SET status = ?, update_time = ? WHERE client_msg_id = ?`, [
      status,
      Date.now(),
      clientMsgId,
    ]);
  }

  updateFileIdByClientId(clientMsgId: string, fileId: string) {
    this.run(`UPDATE ${this.TABLE_NAME} SET file_id = ?, update_time = ? WHERE client_msg_id = ?`, [
      fileId,
      Date.now(),
      clientMsgId,
    ]);
  }

  /**
   * 删除消息
   */
  deleteMessage(id: string) {
    this.run(`DELETE FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
  }
}
