# Web 统一上传流水线

## 背景

Web 端文件上传逻辑与 Electron 端存在分叉：Electron 在文件上传完成拿到 `fileId` 后会继续通过 socket 发送文件消息；Web 端此前依赖 `uploadComplete({ usage: 'message' })` 的服务端副作用。该差异会导致秒传命中或不同后端合并路径下出现“文件上传完成，但聊天消息没有稳定发出”的问题。

## 当前基础

- `packages/shared-api` 已有 `UploadService`，三端可共享 HTTP 上传 API。
- Electron 端已有成熟的本地 pending 消息、上传任务、分片进度、完成后发送消息流程。
- Web 端已有 IndexedDB 上传任务、pending 消息和重试能力。

## 目标

- 抽出三端可复用的上传流水线，统一 `init -> status -> chunk -> complete` 行为。
- Web 端上传完成后显式发送文件消息，秒传和分片完成走同一条消息发送路径。
- 保留各端本地存储、UI 通知和 socket 适配边界，不把端侧状态塞进共享包。

## 产品需求

- 用户发送文件后立即看到上传中的本地 pending 消息。
- 文件秒传、断点续传、普通分片上传都能最终发出聊天消息。
- 上传进度持续回写当前消息。
- 上传失败后消息进入失败状态，可通过现有重试入口重新选择文件。

## Web 适配要点

- Web 端使用共享 `uploadFileWithPipeline` 完成文件上传。
- Web 端在拿到 `fileId` 后使用原 `clientMsgId` 调用 `sendMessage`，让 pending 消息可被 ack 或服务端回推覆盖。
- `UploadTask.messageType` 收窄为 `MessageType`，避免后续发送文件消息时类型过宽。
- 上传返回的文件 `size` 与服务端序列化结果保持 `number`。

## 任务编排

- 在 `packages/shared-api` 增加纯上传流水线。
- Web 上传服务接入共享流水线。
- Web 消息发送支持外部传入 `clientMsgId`，并带上音频 `durationSec`、`waveform`。
- 修正上传文件返回类型契约。
- 执行受影响包 lint/typecheck 和根目录检查。

## 风险点

- Electron 端当前仍保留原上传调度器，后续可在不改变 SQLite/WindowManager 边界的前提下继续接入共享 `completeUploadSession`。
- 根目录检查仍受既有 `shared-utils` lint 与 `electron_client` rootDir typecheck 问题影响。
