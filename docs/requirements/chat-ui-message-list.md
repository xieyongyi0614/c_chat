# Chat UI Message List 迁移

## 背景

当前聊天消息列表实现分散在 frontend 私有组件中，Electron 端可以使用，但 Web 和其他端需要重复处理消息分组、发送者信息、媒体预览、音频播放和重发逻辑。为了让三端通过传参复用同一套消息列表，需要把纯 UI 和列表编排迁到 `packages/chat_ui`。

## 当前基础

- `packages/chat_ui` 已有 `ChatMessageScrollArea`、`ChatMessageContent`、文本、图片、文件、视频、音频等消息基础组件。
- frontend 的消息数据由 `useMessageStore` 维护，结构为 `dateKeys + groups + msgMap`。
- Electron 私有能力包括 IPC 读取本地文件、打开媒体预览、重发消息和音频播放控制。

## 目标

- 在 `@c_chat/ui` 中提供可复用 `MessageList`。
- frontend 仅保留平台适配层，通过 props 传入数据和平台能力。
- Web 端可直接传入同结构数据，并用 Web 自己的 URL、预览、音频、重发实现复用。
- 发送消息或重发消息时尽量避免整个消息列表无意义重绘。

## 产品需求

- 支持单聊和群聊消息展示。
- 群聊展示发送者头像和昵称，并支持查看账号信息。
- 支持文本、图片组、文件、视频和音频消息。
- 支持加载更早消息、加载最新消息和滚动到底部。
- 支持失败消息重发。
- 支持媒体预览入口。

## Web 适配要点

- Web 端传入 `conversationKey`、`dateKeys`、`groups`、`msgMap`、`currentUser`、`senderProfiles`。
- Web 端传入 `fileResolver.formatFileUrl` 处理资源 URL。
- 如果有本地预览需求，Web 端可传入 `fileResolver.loadLocalPreview`。
- Web 端通过 `AudioControlsSlot` 在自己的组件内接入音频播放 hook。
- Web 端通过 `onRetryMessages` 和 `onOpenPreview` 接入自己的 API 或路由。

## 任务编排

1. 新增 `packages/chat_ui/src/chat/messageList`。
2. 将消息列表、日期分组、消息项、账号信息弹窗和媒体预览工具迁入 `chat_ui`。
3. 将 frontend `MessageHistoryList` 改为平台适配层。
4. 删除 frontend 私有 `message/` 旧实现。
5. 优化 `messageStore` 重建逻辑，复用未变化的 group 数组引用。
6. 执行 typecheck/lint 并记录结果。

## 风险点

- frontend typecheck 当前仍受既有 `GroupDetailDialog` 按钮类型问题影响。
- frontend typecheck 当前仍受 `packages/chat_ui` 源码 `@/` alias 在 frontend 项目内解析失败影响。
- 如果某端传入的 `msgMap` 每次都全量重建且不复用数组引用，旧消息项仍会被迫重渲染。
