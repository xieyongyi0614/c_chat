import { UploadStatusEnum } from '@c_chat/shared-types';
import { db } from '@c_chat/shared-config';
import { uploadTaskTableClass } from '../db';
import { startUpload } from './uploadTaskRunner';

class UploadScheduler {
  private queue: string[] = [];
  private running = new Set<string>();
  private concurrency = 3;

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  // ✅ 添加任务
  addTask(taskId: string) {
    // ❗ 防重复
    if (this.queue.includes(taskId) || this.running.has(taskId)) return;

    this.queue.push(taskId);

    uploadTaskTableClass.updateStatus(taskId, UploadStatusEnum.waiting);

    this.schedule();
  }

  // ✅ 调度
  private schedule() {
    while (this.running.size < this.concurrency && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) return;

      this.runTask(taskId);
    }
  }

  // ✅ 执行任务（核心）
  private async runTask(taskId: string) {
    this.running.add(taskId);

    // ✅ 标记 DB
    uploadTaskTableClass.setRunning(taskId, true);

    try {
      await startUpload(taskId, db.DEFAULT_WINDOW_ID);
    } catch (e) {
      console.error('upload error', e);
    } finally {
      this.running.delete(taskId);

      // ✅ 清理 DB 状态
      uploadTaskTableClass.setRunning(taskId, false);

      this.schedule();
    }
  }

  // ✅ 恢复任务（启动时）
  resumePendingTasks() {
    const tasks = uploadTaskTableClass.getPendingTasks();

    tasks.forEach((task) => {
      if (!task.isRunning) {
        this.addTask(task.id);
      }
    });
  }

  // ✅ 初始化（必须调用）
  init() {
    // 1️⃣ 防止崩溃残留
    uploadTaskTableClass.resetRunningTasks();

    // 2️⃣ 恢复任务
    this.resumePendingTasks();
  }
}

export const uploadScheduler = new UploadScheduler(3);
