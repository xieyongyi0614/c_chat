import { LocalMessageListItem, MessageStatusEnum } from '@c_chat/shared-types';
import { TableConnection } from '../Table';
import { DEFAULT_MESSAGE_PAGE_SIZE } from '@c_chat/shared-config';

export class MessageTable extends TableConnection {
  readonly TABLE_NAME = 'messages';
  private readonly fields = [
    'id',
    'conversation_id',
    'msg_id',
    'client_msg_id',
    'sender_id',
    'content',
    'type',
    'status',
    'create_time',
    'update_time',
    'local_time',
    'media_group_id',
    // media
    'file_id',
    'file_url',
    'file_name',
    'mime_type',
    'file_size',
    'duration',
    'waveform',
  ] as const;
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
        file_name TEXT,
        mime_type TEXT,
        file_size INTEGER,
        waveform TEXT,
        duration INTEGER,
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
  private buildValues(msg: LocalMessageListItem) {
    return [
      msg.id,
      msg.conversationId,
      msg.msgId,
      msg.clientMsgId,
      msg.senderId,
      msg.content,
      msg.type,
      msg.status,
      msg.createTime,
      msg.updateTime,
      msg.localTime,
      msg.mediaGroupId,
      msg.fileId,
      msg.fileUrl,
      msg.fileName,
      msg.mimeType,
      msg.fileSize,
      msg.duration,
      msg.waveform,
    ];
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
        ORDER BY local_time DESC
        LIMIT ?
        `,
        [conversationId, limit],
      );
    }

    return rows;
  }

  getLatestServerMsgId(conversationId: string) {
    const row = this.get<[string], { msgId: number }>(
      `
      SELECT msg_id AS msgId FROM ${this.TABLE_NAME}
      WHERE conversation_id = ?
        AND msg_id IS NOT NULL
      ORDER BY msg_id DESC
      LIMIT 1
      `,
      [conversationId],
    );
    return row?.msgId ?? 0;
  }

  getExistingServerMsgIds(conversationId: string, msgIds: number[]) {
    if (msgIds.length === 0) return new Set<number>();

    const placeholders = msgIds.map(() => '?').join(', ');
    const rows = this.all<{ msgId: number }>(
      `
      SELECT msg_id AS msgId FROM ${this.TABLE_NAME}
      WHERE conversation_id = ?
        AND msg_id IN (${placeholders})
      `,
      [conversationId, ...msgIds],
    );

    return new Set(rows.map((row) => row.msgId));
  }

  getMessagesByServerMsgIdRange(conversationId: string, minMsgId: number, maxMsgId: number) {
    return this.all<LocalMessageListItem>(
      `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE conversation_id = ?
        AND msg_id BETWEEN ? AND ?
      ORDER BY msg_id DESC
      `,
      [conversationId, minMsgId, maxMsgId],
    );
  }

  /**
   * 获取最新的一条消息
   */
  getLastMessage(conversationId: string) {
    const row = this.get<[string], LocalMessageListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE conversation_id = ? ORDER BY create_time DESC LIMIT 1`,
      [conversationId],
    );
    return row;
  }

  getByClientMsgId(clientMsgId: string) {
    const row = this.get<[string], LocalMessageListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE client_msg_id = ? LIMIT 1`,
      [clientMsgId],
    );
    return row;
  }
  insert(msg: LocalMessageListItem) {
    const placeholders = this.fields.map(() => '?').join(', ');

    const sql = `
    INSERT INTO ${this.TABLE_NAME} (
      ${this.fields.join(', ')}
    )
    VALUES (${placeholders})
  `;
    this.run(sql, this.buildValues(msg));
  }

  private buildUpsertSql() {
    const fields = this.fields.join(', ');

    const placeholders = this.fields.map(() => '?').join(', ');

    const updateFields = [
      'msg_id',
      'status',
      'content',
      'update_time',
      'file_id',
      'file_url',
      'file_name',
      'mime_type',
      'file_size',
      'duration',
      'waveform',
      'media_group_id',
    ];

    const updateSql = updateFields
      .map((field) => `${field} = COALESCE(excluded.${field}, ${this.TABLE_NAME}.${field})`)
      .join(',\n');

    return `
      INSERT INTO ${this.TABLE_NAME} (
        ${fields}
      )
      VALUES (${placeholders})
  
      ON CONFLICT(conversation_id, client_msg_id)
      DO UPDATE SET
        ${updateSql}
  
      ON CONFLICT(conversation_id, msg_id)
      DO UPDATE SET
        ${updateSql}
    `;
  }

  /**
   * 批量更新消息
   */
  upsertMessages(msgs: LocalMessageListItem[]) {
    if (msgs.length === 0) return;

    const sql = this.buildUpsertSql();

    const transaction = this.db?.transaction((items: LocalMessageListItem[]) => {
      for (const msg of items) {
        this.run(sql, this.buildValues(msg));
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
