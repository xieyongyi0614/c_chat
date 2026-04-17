import { LocalConversationListItem } from '@c_chat/shared-types';
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
        last_msg_content TEXT,
        last_msg_time INTEGER,
        update_time INTEGER,
        create_time INTEGER,
        user_nickname TEXT,
        user_avatar TEXT,
        group_name TEXT,
        group_avatar TEXT
      )
    `;
    this.run(sql);
  }

  /**
   * 获取所有会话
   */
  getAllConversations(): LocalConversationListItem[] {
    const rows = this.all<any>(`SELECT * FROM ${this.TABLE_NAME} ORDER BY last_msg_time DESC`);
    return rows.map(this.mapRowToRecord);
  }

  /**
   * 分页获取会话
   */
  getConversations(
    page = DEFAULT_LIST_DATA.pagination.page,
    pageSize = DEFAULT_LIST_DATA.pagination.pageSize,
  ) {
    const offset = (page - 1) * pageSize;
    const rows = this.all<LocalConversationListItem>(
      `SELECT * FROM ${this.TABLE_NAME} ORDER BY last_msg_time DESC LIMIT ? OFFSET ?`,
      [pageSize, offset],
    );
    return rows.map(this.mapRowToRecord);
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
    const row = this.get<[string], any>(`SELECT * FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
    return row ? this.mapRowToRecord(row) : undefined;
  }

  /**
   * 获取最近更新时间
   */
  getLatestUpdateTime(): number {
    const row = this.get<[], { update_time: number }>(
      `SELECT MAX(update_time) as update_time FROM ${this.TABLE_NAME}`,
    );
    return row?.update_time ?? 0;
  }

  /**
   * 批量更新会话
   */
  upsertConversations(convos: LocalConversationListItem[]) {
    if (convos.length === 0) return;

    const sql = `
      INSERT INTO ${this.TABLE_NAME} (id, type, target_id, last_msg_content, last_msg_time, update_time, create_time, user_nickname, user_avatar, group_name, group_avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_msg_content = excluded.last_msg_content,
        last_msg_time = excluded.last_msg_time,
        update_time = excluded.update_time,
        user_nickname = excluded.user_nickname,
        user_avatar = excluded.user_avatar,
        group_name = excluded.group_name,
        group_avatar = excluded.group_avatar
    `;

    const stmt = this.db?.prepare(sql);
    const transaction = this.db?.transaction((items: LocalConversationListItem[]) => {
      for (const convo of items) {
        stmt?.run(
          convo.id,
          convo.type,
          convo.targetId,
          convo.lastMsgContent,
          convo.lastMsgTime,
          convo.updateTime,
          convo.createTime,
          convo.userNickname,
          convo.userAvatar,
          convo.groupName,
          convo.groupAvatar,
        );
      }
    });

    transaction?.(convos);
  }

  /**
   * 删除会话
   */
  deleteConversation(id: string) {
    this.run(`DELETE FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);
  }

  private mapRowToRecord(row: any): LocalConversationListItem {
    return {
      id: row.id,
      type: row.type,
      targetId: row.target_id,
      lastMsgContent: row.last_msg_content,
      lastMsgTime: row.last_msg_time,
      updateTime: row.update_time,
      createTime: row.create_time,
      userNickname: row.user_nickname,
      userAvatar: row.user_avatar,
      groupName: row.group_name,
      groupAvatar: row.group_avatar,
    };
  }
}
