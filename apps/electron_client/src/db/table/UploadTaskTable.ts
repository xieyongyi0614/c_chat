import { LocalUploadTaskListItem, UploadStatusEnum } from '@c_chat/shared-types';
import { TableConnection } from '../Table';

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
        file_hash TEXT,
      
        file_id TEXT, 
      
        status INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
      
        uploaded_bytes INTEGER DEFAULT 0,
        is_running INTEGER DEFAULT 0,

        upload_session_id TEXT,
        window_id INTEGER DEFAULT 1,
        chunk_size INTEGER,
        uploaded_chunks INTEGER DEFAULT 0,
        total_chunks INTEGER DEFAULT 0,
        is_instant INTEGER DEFAULT 0,
        error_message TEXT,

        create_time INTEGER,
        update_time INTEGER
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
        file_hash,
        file_id,
        status,
        progress,
        uploaded_bytes,
        is_running,
        upload_session_id,
        window_id,
        chunk_size,
        uploaded_chunks,
        total_chunks,
        is_instant,
        error_message,
        create_time,
        update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const {
      id,
      clientMsgId,
      filePath,
      fileName,
      fileSize,
      mimeType,
      fileHash,
      fileId = null,
      status,
      progress,
      uploadedBytes,
      isRunning = 0,
      uploadSessionId,
      windowId = 1,
      chunkSize = null,
      uploadedChunks,
      totalChunks,
      isInstant,
      errorMessage,
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
      fileHash,
      fileId,
      status,
      progress,
      uploadedBytes,
      isRunning,
      uploadSessionId,
      windowId,
      chunkSize,
      uploadedChunks,
      totalChunks,
      isInstant,
      errorMessage,
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

  updateFileHash(id: string, fileHash: string) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET file_hash = ?, update_time = ?
      WHERE id = ?
    `;
    this.run(sql, [fileHash, Date.now(), id]);
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
  getPendingTasks() {
    const sql = `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE status IN (0, 1, 2)
      AND is_running = 0
      ORDER BY create_time ASC
    `;
    return this.all(sql);
  }
  // ✅ 根据 clientMsgId 查
  getByClientMsgIdList(clientMsgId: string) {
    const sql = `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE client_msg_id = ?
    `;

    return this.all<LocalUploadTaskListItem>(sql, [clientMsgId]) || null;
  }
  // ✅ 根据 id 查
  getByTaskId(taskId: string) {
    const sql = `
      SELECT * FROM ${this.TABLE_NAME}
      WHERE id = ?
      LIMIT 1
    `;
    return this.get<[string], LocalUploadTaskListItem>(sql, [taskId]) || null;
  }

  // ✅ 删除任务（完成后可清理）
  delete(id: string) {
    const sql = `
      DELETE FROM ${this.TABLE_NAME}
      WHERE id = ?
    `;

    this.run(sql, [id]);
  }
  // ✅ 标记运行状态
  setRunning(id: string, running: boolean) {
    const sql = `
    UPDATE ${this.TABLE_NAME}
    SET is_running = ?, update_time = ?
    WHERE id = ?
  `;
    this.run(sql, [running ? 1 : 0, Date.now(), id]);
  }

  // ✅ 重置异常任务（启动时用）
  resetRunningTasks() {
    const sql = `
    UPDATE ${this.TABLE_NAME}
    SET is_running = 0
    WHERE is_running = 1
  `;
    this.run(sql);
  }
  setUploadSessionId(id: string, sessionId: string) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET upload_session_id = ?, update_time = ?
      WHERE id = ?
    `;
    this.run(sql, [sessionId, Date.now(), id]);
  }
  updateChunkProgress(id: string, uploadedChunks: number) {
    const task = this.getByTaskId(id);
    if (!task) return;

    const total = task.totalChunks || 1;
    const progress = Math.floor((uploadedChunks / total) * 100);

    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET uploaded_chunks = ?, progress = ?, update_time = ?
      WHERE id = ?
    `;
    this.run(sql, [uploadedChunks, progress, Date.now(), id]);
  }
  /** 设置秒传 */
  markInstantSuccess(id: string, fileId: string) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET 
        status = 3,
        is_instant = 1,
        file_id = ?,
        progress = 100,
        is_running = 0,
        update_time = ?
      WHERE id = ?
    `;
    this.run(sql, [fileId, Date.now(), id]);
  }
  setError(id: string, error: string) {
    const sql = `
      UPDATE ${this.TABLE_NAME}
      SET 
        status = -1,
        error_message = ?,
        is_running = 0,
        update_time = ?
      WHERE id = ?
    `;
    this.run(sql, [error, Date.now(), id]);
  }
}
