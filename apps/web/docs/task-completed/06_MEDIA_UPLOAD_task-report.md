# 06 媒体上传 - Task Report

## 模块

Web 端（apps/web）媒体上传一期。

## 范围

基于 File API + shared-api `UploadService` + IndexedDB `upload_tasks`，实现图片/文件/视频/音频的分片上传、秒传、断点续传、进度展示与失败重试。遵循方案 B：complete 后由服务端建消息并通过 `newUpdateMessage` 覆盖本地 pending，客户端不二次 `sendMessage`。

## 修改文件

- `apps/web/lib/services/upload.service.ts`（新增）— `UploadManager`：采样 hash（头/中/尾 256KB + size，SHA-256，对齐桌面端）、`uploadInit` → 秒传分支 / `getUploadStatus` → `File.slice` 分片并发上传（并发 4）→ `uploadComplete({usage:'message'})`；pending 消息与 `upload_tasks` 元信息写入 IndexedDB；进度回写消息 `progress`；`retry` 支持 File 丢失后重新选择同一文件续传。
- `apps/web/app/chats/_components/ChatInput.tsx` — 启用 Paperclip 附件按钮 + 隐藏 `<input type="file" multiple>` + 拖拽上传，多选逐个上传。
- `apps/web/app/chats/_components/MessageItem.tsx` — `uploading` 状态显示 Spinner + 百分比；媒体 pending 失败时重试改为重新选择文件并调用 `uploadManager.retry`。
- `apps/web/lib/services/index.ts` — 导出 `uploadManager`。

## Review 结论

### BLOCKER

无。

### WARNING（已修复）

1. `updateProgress` 旧实现把已上传分片伪造成 `[0..finished-1]` 写入 IndexedDB，断点续传场景与服务端真实分片集合不一致（虽不影响续传决策，因续传以 `getUploadStatus` 为权威）。已重构为维护真实 `uploadedIndices: Set<number>`，`persistProgress` 持久化真实下标集合，进度按 `size/totalChunks` 计算。

### NIT

1. `crypto.subtle` 需安全上下文（https / localhost），dev 在 localhost:4000 满足，生产需 https。仅记录，不改。
2. 分片池内多 worker 并发回写消息 `progress`，因 `uploadedIndices.size` 单调递增，写入值单调收敛，无需加锁。

## 校验

- `cd apps/web && pnpm typecheck` — PASS
- `cd apps/web && pnpm lint` — PASS
- 根目录 `pnpm typecheck` — `@c_chat/web` 等 10/12 包 PASS；`@c_chat/electron_client` 因 tsconfig `rootDir` 报 `TS6059`（引用 `packages/shared-types/*`），经 stash 本次改动后在干净树上仍复现 31 处同类错误，属**预存在且与本任务无关**的 electron 配置问题，本任务未触碰 electron_client 与 shared-types。

## 方案 B 合规

- complete 后不调用 `sendMessage`，依赖 `message.service` 已有的 `newUpdateMessage` 监听覆盖 pending。
- complete / chunk 幂等：续传只补缺失分片，complete 由服务端去重建消息，重试不重复建消息。
- 上传中预览使用 object URL，完成/秒传/失败均 `revokeObjectURL` 释放。
