# 媒体上传需求分析与任务编排

## 背景

当前项目已经有一条可工作的上传链路，但它更像“文件上传 + 完成后补发消息”的组合，而不是 Telegram 那种“消息即上传任务”的媒体提交系统。

现状里，Electron 负责本地任务调度、分片上传和进度维护，服务端负责 session、chunk 落盘、merge 和 File 入库，WebSocket 负责上传完成后的消息补发。这个链路能跑，但有几个结构性问题：

- 上传 session 只围绕文件，不围绕消息上下文。
- 分片状态既有数据库表，又依赖磁盘目录，权威源不够单一。
- 上传完成后还要客户端再发一次消息，恢复和幂等复杂。
- WebSocket 只覆盖最终完成通知，缺少完整的上传生命周期事件。
- File / Media / MessageHistory 的边界还没有完全对齐 Telegram 风格。

本文件用于把当前上传链路整理成一份需求分析与任务编排，目标是落成一条更稳定的媒体上传管线。

## 当前基础

### 已有能力

- Electron 本地有 `upload_task` 表，记录文件路径、hash、会话 ID、进度、chunk 进度和错误状态。
- Electron 侧已有上传调度器，支持并发任务和断线恢复。
- 客户端可通过 `/upload/init`、`/upload/chunk`、`/upload/status`、`/upload/complete` 与服务端交互。
- 服务端已有 `UploadSession`、`UploadChunk`、`File`、`Media`、`MessageHistory` 等核心模型。
- 服务端已有 chunk 落盘、merge、File upsert 和上传完成后 WebSocket 通知。
- 前端已有消息上传中的本地展示能力，能展示进度和失败状态。

### 主要断点

- `UploadSession` 仍然更偏向“文件会话”，不是“消息媒体任务”。
- `UploadChunk` 表没有成为完整的权威状态源，当前 status 查询仍偏向目录扫描。
- `/upload/complete` 之后客户端还要再发消息，导致链路分叉。
- 秒传、重试、补传、断线恢复没有统一的幂等边界。
- 上传完成后没有把 `File`、`Media`、`MessageHistory` 作为一个整体完成。

## 目标

做成一条 Telegram 风格的媒体上传链路：

1. 用户发起媒体消息时，本地先生成 pending message。
2. Electron 创建 upload task，并把消息上下文绑定到 upload session。
3. 客户端上传分片，服务端记录权威 chunk 状态。
4. 上传完成后，服务端直接 merge、创建 File、创建 Media、创建 MessageHistory。
5. 服务端推送最终消息更新，客户端只负责展示和恢复，不再补发消息。

## 方案选择

本需求采用 **方案 B**，也就是：

- 上传完成后由服务端直接创建媒体消息。
- 客户端不再在 complete 后二次调用 sendMessage。
- 上传和消息创建合并为一个服务端权威流程。

## 非目标

一期不做这些：

- 不做完整媒体编辑器。
- 不做转码平台。
- 不做 CDN 资源管理。
- 不做复杂的媒体裁剪、滤镜、OCR、字幕等能力。
- 不改成移动端专用方案。

## 需求拆解

### 1. 上传会话要绑定消息上下文

`UploadSession` 不再只是文件上传会话，而要承载一次“媒体消息提交”的上下文。

建议至少包含：

- `client_msg_id`
- `conversation_id`
- `uploader_id`
- `file_name`
- `file_size`
- `mime_type`
- `sample_hash`
- `content_hash`
- `chunk_size`
- `total_chunks`
- `uploaded_chunks`
- `uploaded_bytes`
- `message_type`
- `media_group_id`
- `content`
- `duration`
- `waveform`
- `status`
- `file_id`
- `error_message`

### 2. 分片状态要权威化

`UploadChunk` 要成为分片状态的唯一落库点。

要求：

- `upload_id + chunk_index` 唯一。
- `/upload/chunk` 幂等。
- 已存在的 chunk 直接返回成功，不重复计数。
- `/upload/status` 从数据库读取已落盘分片，而不是依赖目录扫描。

### 3. complete 要直接产出媒体消息

`/upload/complete` 完成后，服务端要做完以下事情：

- 校验 session 完整性。
- merge chunk。
- 生成或确认文件 hash。
- upsert `File`。
- 创建 `Media`。
- 创建 `MessageHistory`。
- 更新 `UploadSession.status`。
- 推送最终消息更新。

### 4. 秒传要直接返回成功态

如果 init 阶段已经命中可复用文件，服务端可以直接返回：

- `file`
- 或者直接创建消息并推送结果

这样客户端不用再进入完整 chunk 上传流程。

### 5. 前端只负责本地体验

客户端职责收敛为：

- 创建本地 pending message。
- 创建本地 upload task。
- 展示 chunk 进度。
- 监听最终消息更新。
- 失败时做本地回滚或重试入口。

客户端不再承担“上传完成后再发消息”的第二段业务。

## 数据模型建议

### UploadSession

建议将其定位为“一次媒体提交任务”。

推荐字段方向：

- `id`
- `client_msg_id`
- `conversation_id`
- `uploader_id`
- `file_name`
- `file_size`
- `mime_type`
- `sample_hash`
- `content_hash`
- `chunk_size`
- `total_chunks`
- `uploaded_chunks`
- `uploaded_bytes`
- `message_type`
- `media_group_id`
- `content`
- `duration`
- `waveform`
- `status`
- `file_id`
- `error_message`
- `create_time`
- `update_time`

建议取消：

- `fileHash @unique` 作为 session 唯一约束。

### UploadChunk

建议至少保留：

- `upload_id`
- `chunk_index`
- `chunk_hash`
- `size`
- `created_at`

建议约束：

- `@@unique([upload_id, chunk_index])`

### File

建议将文件资产定位为可复用的原始文件：

- `id`
- `file_name`
- `sample_hash`
- `content_hash`
- `mime_type`
- `ext`
- `size`
- `url`
- `uploader_id`
- `status`

建议唯一去重以：

- `content_hash + size`

为主。

### Media

建议继续作为消息媒体层：

- `file_id`
- `type`
- `file_url`
- `thumb_url`
- `width`
- `height`
- `duration`
- `waveform`
- `extra`

## WebSocket 需求

### 现有事件保留

- `newUpdateMessage` 继续作为最终消息同步事件。

### 建议补充

- `uploadProgress`
- `uploadFailed`
- `uploadCompleted`
- `mediaProcessed`

说明：

- 本地上传进度主要由 Electron IPC 驱动。
- WebSocket 更适合服务端 merge、失败和最终消息状态同步。

## 用户体验要求

- 用户发送媒体后，消息应立即进入 uploading 状态。
- 进度条应持续可见。
- 秒传成功时，消息应快速变为成功态。
- 失败时，消息应明确展示失败原因和重试入口。
- 断线恢复后，已存在 session 应可继续上传。

## 风险点

- 现有 `sendFileUploadComplete -> sendMessage` 链路不能和方案 B 并存太久，否则容易出现双发消息。
- `UploadSession` 绑定消息上下文后，前端和后端都要按同一套字段理解。
- chunk 幂等、complete 幂等、消息幂等必须一起做，否则重试会重复建消息。
- 秒传判断不能只靠采样 hash 作为最终唯一依据。

## 任务编排

### 阶段 0：边界确认

目标：把上传、消息、媒体三层职责边界定死。

- [ ] 确认 `UploadSession` 改为承载消息上下文。
- [ ] 确认 complete 后由服务端直接创建消息。
- [ ] 确认客户端不再二次调用 sendMessage。
- [ ] 确认秒传与分片上传返回的响应结构。
- [ ] 确认 WebSocket 只承担结果同步，不承担主上传控制流。

产出：

- 上传链路的职责边界清晰，避免后续前后端重复改协议。

### 阶段 1：服务端模型调整

目标：让数据库表达正确的上传状态。

- [ ] 调整 `UploadSession` 字段，加入消息上下文。
- [ ] 让 `UploadChunk` 成为分片权威状态。
- [ ] 调整 `File` 唯一去重策略。
- [ ] 校验 `Media` 是否需要补充缩略图和处理状态字段。
- [ ] 补充必要索引。

产出：

- 数据层能够稳定表示一次媒体提交任务。

### 阶段 2：服务端上传流程

目标：让 init、chunk、complete 形成闭环。

- [ ] 改造 `/upload/init`，支持消息上下文入参。
- [ ] 改造 `/upload/chunk`，保证幂等和分片落库。
- [ ] 改造 `/upload/status`，从数据库返回已上传分片。
- [ ] 改造 `/upload/complete`，完成 merge 后直接创建 File / Media / MessageHistory。
- [ ] complete 失败时返回可重试错误。

产出：

- 服务端可以独立完成一次媒体消息提交。

### 阶段 3：Electron 本地任务链路

目标：让本地任务和服务端 session 对齐。

- [ ] 调整 `upload_task` 的任务创建字段。
- [ ] 把本地任务与 `client_msg_id`、`upload_session_id`、`conversation_id` 对齐。
- [ ] 保留 chunk 并发上传和本地进度更新。
- [ ] 去掉上传完成后再发消息的第二段逻辑。
- [ ] 失败后支持 retry 和恢复。

产出：

- 本地体验保持顺滑，但业务权威不再落在客户端。

### 阶段 4：消息与媒体同步

目标：让服务端创建的消息正确落到前端。

- [ ] 让 `newUpdateMessage` 足够承载上传完成后的消息更新。
- [ ] 确认消息列表、聊天窗口和上传任务状态能同步刷新。
- [ ] 确认本地 pending message 可被服务端结果覆盖。
- [ ] 确认秒传场景也能走同一套最终消息更新逻辑。

产出：

- 媒体消息最终态只由服务端决定。

### 阶段 5：体验补齐

目标：补齐上传链路的边界体验。

- [ ] 增加失败状态与重试入口。
- [ ] 增加任务恢复策略。
- [ ] 处理上传中途关闭窗口的恢复。
- [ ] 处理重复 init / complete / chunk 的幂等问题。
- [ ] 统一错误文案和 toast 反馈。

产出：

- 上传链路在异常场景下仍可恢复。

## 推荐开发顺序

1. 先改服务端 `UploadSession` 和 `UploadChunk`。
2. 再改 `/upload/init`、`/upload/chunk`、`/upload/status`、`/upload/complete`。
3. 接着改 Electron 上传任务的创建与恢复逻辑。
4. 然后清理客户端二次发消息链路。
5. 最后补 WebSocket 事件和体验细节。

这个顺序能尽早暴露协议问题，也能避免前后端重复返工。

## 验收标准

- 上传完成后，服务端直接创建媒体消息。
- 客户端不再二次 sendMessage。
- chunk 重试不会重复计数。
- complete 重试不会重复建消息。
- 秒传场景能直接得到成功态。
- 断线恢复后可继续上传。
- 前端消息列表能正确收到最终更新。
