import {
  ConversationType,
  DBConversationListItem,
  LocalConversationListItem,
} from '@c_chat/shared-types';
import { TableConnection } from '../Table';
import { DEFAULT_LIST_DATA } from '@c_chat/shared-config';

export class ConversationTable extends TableConnection {
  readonly TABLE_NAME = 'conversations';

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
        type INTEGER,
        target_id TEXT,
        target_name TEXT,
        target_avatar TEXT,
        unread_count INTEGER DEFAULT 0,
        last_read_message_id INTEGER DEFAULT 0,
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
  getAllConversations(): LocalConversationListItem[] {
    const rows = this.all<DBConversationListItem>(
      `SELECT * FROM ${this.TABLE_NAME} ORDER BY last_msg_time DESC`,
    );
    return rows.map(this.mapRowToRecord.bind(this));
  }

  /**
   * 分页获取会话
   */
  getConversations(
    page = DEFAULT_LIST_DATA.pagination.page,
    pageSize = DEFAULT_LIST_DATA.pagination.pageSize,
  ) {
    const offset = (page - 1) * pageSize;
    const rows = this.all<DBConversationListItem>(
      `SELECT * FROM ${this.TABLE_NAME} ORDER BY last_msg_time DESC LIMIT ? OFFSET ?`,
      [pageSize, offset],
    );
    return rows.map(this.mapRowToRecord.bind(this));
  }

  /**
   * 获取会话总数
   */
  getConversationCount(): number {
    const row = this.get<[], { count: number }>(`SELECT COUNT(*) as count FROM ${this.TABLE_NAME}`);
    return row?.count ?? 0;
  }

  /**
   * 获取单个会话
   */
  getConversation(id: string): LocalConversationListItem | undefined {
    const row = this.get<[string], DBConversationListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE id = ?`,
      [id],
    );
    return row ? this.mapRowToRecord(row) : undefined;
  }

  getConversationByIds(ids: string[]): LocalConversationListItem[] {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(',');

    const rows = this.all<DBConversationListItem>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE id IN (${placeholders})`,
      ids,
    );

    return rows.map((row) => this.mapRowToRecord(row));
  }

  /**
   * 获取最近更新时间
   */
  getLatestUpdateTime(): number {
    const row = this.get<[], { updateTime: number }>(
      `SELECT MAX(update_time) as updateTime FROM ${this.TABLE_NAME}`,
    );
    return row?.updateTime ?? 0;
  }

  /**
   * 更新代理设置
   * @param data 要更新的代理数据
   */
  update(data: Partial<LocalConversationListItem> & { id: string }): void {
    const { updateFields, updateValues } = Object.entries(data).reduce<{
      updateFields: string[];
      updateValues: (string | number)[];
    }>(
      (acc, [key, value]) => {
        if (value !== undefined && key !== 'id') {
          acc.updateFields.push(`${key} = ?`);
          acc.updateValues.push(value);
        }
        return acc;
      },
      { updateFields: [], updateValues: [] },
    );

    if (data.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(data.type);
    }

    if (updateFields.length === 0) {
      return;
    }

    // 构建并执行更新SQL
    const updateSQL = `
    UPDATE ${this.TABLE_NAME}
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `;

    // 添加ID到参数列表
    updateValues.push(data.id);

    this.run(updateSQL, updateValues);
  }

  /**
   * 批量更新会话
   */
  upsertConversations(convos: LocalConversationListItem[]) {
    if (convos.length === 0) return;

    const sql = `
      INSERT INTO ${this.TABLE_NAME} (id, type, target_id, target_name, target_avatar, unread_count, last_read_message_id, last_msg_content, last_msg_time, update_time, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        target_id = excluded.target_id,
        target_name = excluded.target_name,
        target_avatar = excluded.target_avatar,
        unread_count = excluded.unread_count,
        last_read_message_id = excluded.last_read_message_id,
        last_msg_content = excluded.last_msg_content,
        last_msg_time = excluded.last_msg_time,
        update_time = excluded.update_time,
        create_time = excluded.create_time
    `;

    const transaction = this.db?.transaction((items: LocalConversationListItem[]) => {
      for (const convo of items) {
        const {
          id,
          type,
          targetId,
          targetName,
          targetAvatar,
          unreadCount = 0,
          lastReadMessageId = 0,
          lastMsgContent,
          lastMsgTime,
          updateTime,
          createTime,
        } = convo;
        this?.run(sql, [
          id,
          type,
          targetId,
          targetName,
          targetAvatar,
          unreadCount,
          lastReadMessageId,
          lastMsgContent,
          lastMsgTime,
          updateTime,
          createTime,
        ]);
      }
    });

    transaction?.(convos);
  }

  reconcileGroupConversations(remoteConvos: LocalConversationListItem[]) {
    const remoteGroupById = new Map(
      remoteConvos
        .filter((item) => item.type === ConversationType.Group)
        .map((item) => [item.id, item]),
    );
    const localGroups = this.getConversationByIds(Array.from(remoteGroupById.keys())).filter(
      (item) => item.type === ConversationType.Group,
    );

    const inconsistent = localGroups.filter((local) => {
      const remote = remoteGroupById.get(local.id);
      return Boolean(
        remote &&
          (remote.targetName !== local.targetName ||
            remote.targetAvatar !== local.targetAvatar ||
            remote.lastMsgContent !== local.lastMsgContent ||
            Number(remote.lastMsgTime ?? 0) !== Number(local.lastMsgTime ?? 0) ||
            Number(remote.updateTime ?? 0) !== Number(local.updateTime ?? 0)),
      );
    });

    if (inconsistent.length > 0) {
      console.warn(
        '[ConversationTable] inconsistent group cache detected:',
        inconsistent.map((item) => item.id),
      );
    }
  }

  /**
   * 删除会话
   */
  deleteConversation(id: string) {
    this.run(`DELETE FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
  }

  /** 转化数据行 */
  private mapRowToRecord(row: DBConversationListItem): LocalConversationListItem {
    const camelRow = row as unknown as {
      id: string;
      type: LocalConversationListItem['type'];
      targetId: string;
      targetName: string;
      targetAvatar: string;
      unreadCount?: number;
      lastReadMessageId?: number;
      lastMsgContent: string;
      lastMsgTime: number;
      updateTime: number;
      createTime: number;
    };
    return {
      id: camelRow.id,
      type: camelRow.type,
      targetId: camelRow.targetId,
      targetName: camelRow.targetName,
      targetAvatar: camelRow.targetAvatar,
      unreadCount: camelRow.unreadCount ?? 0,
      lastReadMessageId: camelRow.lastReadMessageId ?? 0,
      lastMsgContent: camelRow.lastMsgContent,
      lastMsgTime: camelRow.lastMsgTime,
      updateTime: camelRow.updateTime,
      createTime: camelRow.createTime,
    };
  }
  /**
   * 添加file_name列，如果不存在
   */
  addFileNameColumnIfNotExists() {}

  migrate(): void {
    this.addFileNameColumnIfNotExists();
  }
}
