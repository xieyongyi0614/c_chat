# Chat History Upload Fixes

## 背景

Web 端历史消息列表出现内部滚动后，会把页面整体撑开，导致右侧和底部同时出现页面滚动条。图片文件发送链路中，上传初始化后未稳定进入后续上传和发消息闭环，秒传命中时本地 UI 仍停在上传态，刷新后服务端历史也拿不到图片消息。

## 当前基础

- Web 和 Electron 渲染层都逐步复用 `@c_chat/ui` 的 `MessageList` 与 `ChatMessageScrollArea`。
- Electron 发送附件时先写入本地消息，再调用 `/upload/init`，普通上传进入 `UploadScheduler` 分片上传。
- 服务端消息仍通过 shared-protobuf 的 `SendMessageRequest` 走 WebSocket。

## 目标

- 消息列表滚动限制在消息区域内部，不撑开外层页面。
- 图片上传从 init、分片上传、complete 到 WebSocket 发消息形成闭环。
- 秒传命中时也要发送消息，刷新后可从历史消息拿到图片。
- 本地 UI 能收到上传开始、进度、完成或失败状态。

## 产品需求

- 历史消息很多时，只显示消息区域滚动条。
- 图片上传中显示进度，上传完成后退出上传态。
- 秒传图片发送后应表现为普通已发送图片消息。
- 上传或发消息失败时，消息进入失败态，可走现有重试逻辑。

## Web 适配要点

- 共享消息列表容器必须具备 `min-h-0`、`min-w-0` 和内部 `overflow` 约束。
- 页面级消息列父容器也必须允许子滚动区收缩。
- Web 端继续复用 `@c_chat/ui`，避免重复维护两套滚动逻辑。

## 任务编排

1. 修复 `MessageList` 和 `ChatMessageScrollArea` 的滚动容器约束。
2. 修复 Electron 附件上传任务开始、进度、完成后的本地消息状态同步。
3. 在秒传和普通上传完成后发送 shared-protobuf WebSocket 消息。
4. 执行 diff review，补齐失败状态和局部验证。

## 风险点

- 上传任务恢复时依赖已有 socket 连接；如果当前窗口未登录或 socket 未连通，会进入失败态并依赖用户重试。
- 当前仓库存在既有 lint/typecheck 问题，会影响全量检查结果。
