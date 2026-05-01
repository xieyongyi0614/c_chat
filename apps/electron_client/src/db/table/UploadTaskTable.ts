import { LocalUploadTaskListItem, UploadStatusEnum } from '@c_chat/shared-types';
import { TableConnection } from '../Table';

interface DBUploadTaskListItem {
  id: string;
  client_msg_id: string;

  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  fingerprint: string;
  file_hash: string;

  file_id?: string;

  status: UploadStatusEnum;
  progress: number;
  uploaded_bytes: number;

  create_time: number;
  update_time: number;
}

export class UploadTaskTable extends TableConnection {
  readonly TABLE_NAME = 'upload_task';

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id TEXT PRIMARY KEY,
      
        client_msg_id TEXT,
      
        file_path TEXT NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        fingerprint TEXT,
        file_hash TEXT,
      
        file_id TEXT, 
      
        status INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
      
        uploaded_bytes INTEGER DEFAULT 0,
      
        create_time INTEGER,
        update_time INTEGER,
      
        UNIQUE(client_msg_id)
      );
    `;
    this.run(sql);
  }

  // ✅ 插入任务
  insert(task: LocalUploadTaskListItem) {
    const sql = `
      INSERT INTO ${this.TABLE_NAME} (
        id,
        client_msg_id,
        file_path,
        file_name,
        file_size,
        mime_type,
        fingerprint,
        file_hash,
        file_id,
        status,
        progress,
        uploaded_bytes,
        create_time,
        update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const {
      id,
      clientMsgId,
      filePath,
      fileName,
      fileSize,
      mimeType,
      fingerprint,
      fileHash,
      fileId = null,
      status,
      progress,
      uploadedBytes,
      createTime,
      updateTime,
    } = task;
    this.run(sql, [
      id,
      clientMsgId,
      filePath,
      fileName,
      fileSize,
      mimeType,
      fingerprint,
      fileHash,
      fileId,
      status,
      progress,
      uploadedBytes,
      createTime,
      updateTime,
    ]);
  }

  // ✅ 更新进度
  updateProgress(id: string, progress: number, uploadedBytes: number) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET progress = ?, uploaded_bytes = ?, update_time = ?
      WHERE id = ?
    `;

    this.run(sql, [progress, uploadedBytes, Date.now(), id]);
  }

  // ✅ 更新状态
  updateStatus(id: string, status: UploadStatusEnum) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET status = ?, update_time = ?
      WHERE id = ?
    `;

    this.run(sql, [status, Date.now(), id]);
  }

  // ✅ 设置 fileId（上传完成后）
  setFileId(id: string, fileId: string) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET file_id = ?, update_time = ?
      WHERE id = ?
    `;

    this.run(sql, [fileId, Date.now(), id]);
  }

  // ✅ 查询所有未完成任务（关键）
  getPendingTasks(): DBUploadTaskListItem[] {
    const sql = `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE status = 0
    `;

    return this.all(sql);
  }

  // ✅ 根据 clientMsgId 查
  getByClientMsgId(clientMsgId: string): DBUploadTaskListItem | null {
    const sql = `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE client_msg_id = ?
      LIMIT 1
    `;

    return this.get(sql, [clientMsgId]) || null;
  }
  // ✅ 根据 id 查
  getByTaskId(taskId: string): DBUploadTaskListItem | null {
    const sql = `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE id = ?
      LIMIT 1
    `;
    return this.get(sql, [taskId]) || null;
  }

  // ✅ 删除任务（完成后可清理）
  delete(id: string) {
    const sql = `
      DELETE FROM ${this.TABLE_NAME}
      WHERE id = ?
    `;

    this.run(sql, [id]);
  }
}
