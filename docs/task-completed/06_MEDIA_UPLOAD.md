# 媒体上传需求分析与任务编排

## 背景

媒体上传承载图片、文件、视频、头像和语音消息。桌面端依赖 Electron 主进程、本地文件路径和 SQLite 上传任务表；Web 端没有主进程和本地路径，需要基于 File API、`shared-api` 的 `UploadService`、IndexedDB 上传任务缓存来实现同等能力。

本模块沿用 [MEDIA_UPLOAD_REQUIREMENTS.md](../requirements/MEDIA_UPLOAD_REQUIREMENTS.md) 的方案 B：上传完成后由服务端直接创建 File / Media / MessageHistory，并通过 `newUpdateMessage` 推送最终消息，客户端不再 complete 后二次调用 `sendMessage`。

## 当前基础

### 已具备

- `packages/shared-api/src/services/uploadService.ts` 已提供 `uploadInit`、`uploadChunk`、`getUploadStatus`、`uploadComplete`、`getFileByHash`。
- `packages/shared-config` 已有 `UPLOAD_CHUNK_SIZE` 等上传常量。
- `packages/shared-types` 已有上传入参、响应和上传任务相关类型。
- 服务端已有 `/upload/init`、`/upload/chunk`、`/upload/status`、`/upload/complete`。
- 消息模块已规划媒体 pending 与 `newUpdateMessage` 覆盖逻辑，见 [04 消息收发](04_MESSAGING.md)。

### 主要缺口

- Web 端需要基于 File API 选择文件、读取元数据和切片。
- Web 端需要 IndexedDB `upload_tasks` 缓存任务元信息。
- File 对象不能可靠作为长期恢复依据，刷新后续传需要用户重新选择文件或依赖服务端已传分片。
- 上传调度、并发、失败重试和进度展示需要 Web 运行时实现，但 HTTP 调用必须复用 `UploadService`。

## 目标

### 一期目标

- 支持图片、文件、视频和语音 Blob 上传。
- 支持分片上传、进度展示、失败重试。
- 支持秒传和断点续传。
- 上传完成后服务端直接建消息。
- 本地 pending 消息可被服务端正式消息覆盖。
- 上传任务元信息缓存到 IndexedDB。

### 二期方向

- Web Worker 计算 hash 和调度大文件上传。
- 多任务队列暂停/继续。
- 上传速度、剩余时间展示。
- 大文件上传前置校验和压缩策略。

## 产品需求

### 文件选择

用户可以通过文件选择器或拖拽选择媒体文件。

验收标准：

- 支持 `<input type="file">`。
- 支持拖拽文件到聊天输入区。
- 支持多选。
- 从 File 对象提取 `name`、`size`、`type`、`lastModified`。
- 生成可用于上传和预览的 File/Blob 引用。
- 不依赖 `filePath`。

### 分片上传

File 按固定 chunkSize 切片并调用上传端点。

验收标准：

- 使用 `File.slice` 切片。
- 调用 `UploadService.uploadInit` 创建上传会话。
- 调用 `UploadService.uploadChunk` 上传分片。
- 支持有限并发上传。
- 上传进度按已上传字节或分片数更新。
- 单个分片失败可重试。

### 秒传

服务端 init 命中已存在文件时，客户端跳过完整分片上传。

验收标准：

- init 响应能表达秒传成功或已存在文件。
- 秒传时不上传 chunk。
- 秒传后等待或接收服务端最终消息推送。
- 本地 pending 消息更新为成功态。

### 断点续传

刷新、断线或失败后可查询服务端已落盘分片并续传。

验收标准：

- 上传任务元信息写入 IndexedDB。
- 恢复任务时调用 `UploadService.getUploadStatus`。
- 只上传未完成分片。
- File 对象丢失时提示用户重新选择同一文件。
- 续传进度从服务端已完成分片开始计算。

### complete 建消息

分片上传完成后调用 complete，由服务端创建消息。

验收标准：

- 调用 `UploadService.uploadComplete`。
- complete 后服务端创建 File / Media / MessageHistory。
- 客户端不二次调用 `sendMessage`。
- 客户端通过 `newUpdateMessage` 获取最终消息。
- `sendFileUploadComplete` 如存在，仅用于任务状态同步。
- complete 重试不会重复建消息。

### 失败与重试

上传失败时需要明确状态和重试入口。

验收标准：

- 分片失败展示可理解错误。
- complete 失败展示可理解错误。
- 失败任务可点击重试。
- 网络恢复后可继续上传。
- 服务端 session 过期时提示重新上传。

## Web 适配要点

- HTTP 调用统一走 `shared-api` 的 `UploadService`。
- Web 端只负责 File API、hash、切片、调度、任务缓存和 UI 状态。
- IndexedDB `upload_tasks` 只存元信息，不假设 File 对象可长期恢复。
- 上传中的媒体预览使用 object URL，关闭或替换时释放。
- 媒体消息必须遵守方案 B，不在上传完成后再发消息。
- UI 使用 `chat_ui` / shadcn 已有的 Button、Alert、Tooltip、Dialog、ScrollArea、Spinner 等基础组件；上传进度先以现有组件组合展示，不假设项目已经有额外进度条组件。

## 任务编排

### 阶段 0：职责边界确认

目标：确认上传、消息、媒体三层职责。

- [x] 确认 Web 端沿用方案 B。
- [x] 确认 `UploadService` 的四个上传方法满足 Web。
- [x] 确认 `/upload/init` 入参包含消息上下文。
- [x] 确认 complete 后服务端直接创建消息。
- [x] 确认客户端不二次 `sendMessage`。
- [x] 确认推送事件如何覆盖 pending 消息。

产出：

- 上传链路不会和消息链路分叉。

### 阶段 1：File API 与任务创建

目标：用户可选择文件并创建上传任务。

- [x] 实现文件选择。
- [x] 实现拖拽选择。
- [x] 提取文件基础信息。
- [x] 生成 `clientMsgId` 和本地 pending 消息。
- [x] 建立 IndexedDB `upload_tasks`。
- [x] 写入上传任务元信息。

产出：

- 选择媒体后能看到 pending / uploading 消息。

### 阶段 2：分片上传

目标：完成基本上传能力。

- [x] 计算或获取上传所需 hash。
- [x] 调用 `uploadInit`。
- [x] 使用 `File.slice` 切片。
- [x] 并发调用 `uploadChunk`。
- [x] 更新上传进度。
- [x] 处理分片失败重试。

产出：

- 可以上传一张图片或一个文件，进度可见。

### 阶段 3：status、complete 和服务端建消息

目标：上传完成后由服务端生成最终消息。

- [x] 调用 `getUploadStatus` 查询已完成分片。
- [x] 只补传缺失分片。
- [x] 全部分片完成后调用 `uploadComplete`。
- [x] 接收 `newUpdateMessage`。
- [x] 用正式消息覆盖本地 pending。
- [x] 更新上传任务为成功。

产出：

- 媒体上传后消息列表出现服务端正式消息。

### 阶段 4：秒传、恢复和异常体验

目标：补齐边界体验。

- [x] 实现秒传分支。
- [ ] 刷新后读取未完成任务。
- [x] File 丢失时提示重新选择。
- [x] 支持用户重试失败任务。
- [x] 处理 session 过期。
- [ ] 补齐 loading、empty、error 状态。

产出：

- 上传在常见异常场景下可恢复。

## 风险点

- File 对象不能像桌面端 `filePath` 一样长期保存，刷新后可能需要用户重新选择文件。
- complete、chunk、消息创建必须全部幂等，否则重试会重复建消息。
- 秒传不能只依赖采样 hash，应以服务端最终去重策略为准。
- 大文件 hash 和分片上传可能阻塞主线程，后续可迁移到 Web Worker。
- 如果客户端 complete 后仍调用 `sendMessage`，会产生重复媒体消息。
