# 消息收发需求分析与任务编排

## 背景

消息收发是 IM 核心主干，涵盖文本、图片、文件、语音、视频等多类型消息的发送、接收、状态流转、已读回执、历史分页与实时更新。本文档规划 Web 端（Next.js）一比一复刻桌面端（Electron）的消息收发能力。

## 当前桌面端实现

### IPC 方法

来自 `packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`：

**SendMessage**

```typescript
SendMessage: IpcMethod<SendMessageParams, LocalMessageListItem[]>;

interface SendMessageParams {
  conversationId?: string;
  targetId?: string;
  content: string;
  files?: FileInfoListItem[];
  fileId?: string;
  mediaGroupId?: string;
}
```

**ResendMessage**

```typescript
ResendMessage: IpcMethod<ResendMessageParams, LocalMessageListItem[]>;

interface ResendMessageParams {
  clientMsgId: string;
}
```

**ReadMessage**

```typescript
ReadMessage: IpcMethod<ReadMessageParams, ReadMessageResult>;

interface ReadMessageParams {
  conversationId: string;
  messageId?: string;
}

interface ReadMessageResult {
  conversationId: string;
  lastReadSeq: bigint;
  unreadCount: number;
}
```

**GetMessageHistory**

```typescript
GetMessageHistory: IpcMethod<GetMessageHistoryParams, LocalMessageListItem[]>;

interface GetMessageHistoryParams {
  conversationId: string;
  pageSize?: number;
  afterMsgId?: number;
  beforeMsgId?: number;
  limit?: number;
}
```

**GetLocalMessageHistory**

```typescript
GetLocalMessageHistory: IpcMethod<GetMessageHistoryParams, LocalMessageListItem[]>;
```

本地回退方法，参数结构与 `GetMessageHistory` 一致。

### 本地表结构

来自 `packages/shared-types/src/lib/db/MessageTableTypes.ts`：

**LocalMessageListItem**

```typescript
interface LocalMessageListItem {
  id: number;
  conversationId: string;
  seq: bigint;
  clientMsgId: string;
  senderId: string;
  senderNickname?: string;
  senderAvatar?: string;
  senderEmail?: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  updateTime: number;
  createTime: number;
  localTime: number;
  fileId?: string;
  fileUrl?: string;
  filePath?: string;
  mediaGroupId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  waveform?: string;
  duration?: number;
  progress?: number;
}
```

**MessageStatus**

```typescript
enum MessageStatus {
  default = 0,
  sending = 1,
  success = 2,
  uploading = 3,
  fail = -1,
}
```

**MessageType**

来自 `@c_chat/shared-config`，包含：

- 文本
- 图片
- 文件
- 语音
- 视频

### Socket 事件

来自 `packages/shared-protobuf/src/protoMap.ts`：

- `ackSendMessage` — 发送回执
- `newUpdateMessage` — 实时更新
- `ReadMessageResponse` — 已读响应

### 桌面端实现位置

**状态管理**

- `apps/frontend/src/stores/chat/messageStore.ts` — 消息状态，按日期分组

**消息组件**

- `apps/frontend/src/pages/chats/components/middle/message/MessageItem` — 消息项
- `apps/frontend/src/pages/chats/components/middle/message/MessageGroup` — 消息分组
- `apps/frontend/src/pages/chats/components/middle/message/MessageDate` — 日期分隔
- `apps/frontend/src/pages/chats/components/middle/message/MessageStatusIcon` — 状态图标
- `apps/frontend/src/pages/chats/components/middle/message/types/` — 各类型消息组件（Text/Image/File/Audio/Video）

**输入组件**

- `apps/frontend/src/pages/chats/components/middle/input/ChatInput` — 输入框
- `apps/frontend/src/pages/chats/components/middle/input/AttachmentList` — 附件列表
- `apps/frontend/src/pages/chats/components/middle/input/EmojiPicker` — 表情选择器
- `apps/frontend/src/pages/chats/components/middle/input/RecordingButton` — 录音按钮

## Web 端目标

一比一复刻桌面端消息收发能力，包括：

- 多类型消息收发（文本、图片、文件、语音、视频）
- 本地 pending 状态与乐观更新
- ack 状态流转（sending → success/fail）
- 已读回执与未读数同步
- 历史消息分页加载（服务端优先、本地回退）
- 按日期分组展示
- 实时更新（`newUpdateMessage` 推送）
- 失败消息重发
- 图片组（`mediaGroupId`）支持

## 产品需求与验收

### 文本消息收发

用户在输入框输入文本并发送，消息立即以 pending 状态插入本地列表；收到 `ackSendMessage` 后状态转为 success，失败则转为 fail；对端通过 `newUpdateMessage` 实时收到消息。

**验收标准：**

- 发送文本消息后，本地立即显示 pending 状态（sending 图标）
- 收到 ack 后状态更新为 success（勾选图标）
- 发送失败时状态更新为 fail（感叹号图标）
- 对端能实时收到消息并显示在会话列表
- `clientMsgId` 保证消息幂等，不重复插入

### 图片/文件/视频消息

用户选择文件后，消息以 pending 状态展示，经上传链路（见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)）完成后，服务端创建消息记录并通过 `newUpdateMessage` 推送；支持 `mediaGroupId` 实现图片组合并展示。

**验收标准：**

- 选择文件后本地立即显示 pending 消息（uploading 状态）
- 上传进度实时更新（`progress` 字段）
- 上传完成后服务端推送正式消息，本地替换 pending 消息
- 多张图片选择时生成相同 `mediaGroupId`，前端合并展示为图片组
- 文件消息显示文件名、大小、类型图标
- 视频消息显示缩略图与时长

### 语音消息

用户长按录音按钮录制语音，录音完成后随消息发送，详见 [08_VOICE_MESSAGE.md](08_VOICE_MESSAGE.md)。

**验收标准：**

- 长按录音按钮开始录音，松开发送
- 录音时显示实时波形与时长
- 发送后消息包含 `waveform`、`duration` 字段
- 接收方可播放语音并显示波形动画
- 语音消息上传流程与文件消息一致

### 消息状态流转

消息状态从 sending 流转到 success 或 fail，通过 `MessageStatusIcon` 展示；失败消息可通过 `ResendMessage` 按 `clientMsgId` 重发。

**验收标准：**

- sending 状态显示加载图标
- success 状态显示勾选图标
- fail 状态显示感叹号图标，点击可重发
- 重发时使用原 `clientMsgId`，避免重复消息
- 重发成功后状态更新为 success
- uploading 状态显示上传进度条

### 已读回执

用户进入或阅读会话时调用 `ReadMessage`，更新 `lastReadSeq` 与未读数；`ReadMessageResponse` 同步已读状态到其他端。

**验收标准：**

- 进入会话时自动调用 `ReadMessage`
- 滚动到底部时标记最新消息为已读
- 未读数实时更新到会话列表
- `lastReadSeq` 持久化到本地与服务端
- 其他端通过 `ReadMessageResponse` 同步已读状态
- 已读消息显示双勾图标（群聊场景）

### 消息历史与分页

进入会话时拉取历史消息，使用 `afterMsgId`/`beforeMsgId` 实现双向翻页；服务端优先，网络失败时回退到 `GetLocalMessageHistory`；消息按日期分组，通过 `MessageDate` 和 `MessageGroup` 展示。

**验收标准：**

- 进入会话时加载最新 N 条消息（默认 20 条）
- 向上滚动到顶部时加载更早消息（`beforeMsgId` 翻页）
- 向下滚动到底部时加载更新消息（`afterMsgId` 翻页）
- 网络失败时自动回退到本地历史
- 消息按日期分组，日期分隔线显示"今天"、"昨天"、"MM月DD日"
- 同一用户连续消息合并为 `MessageGroup`，省略重复头像与昵称
- 分页边界处理正确，不重复加载

### 实时更新

监听 `newUpdateMessage` 事件，消息到达时插入或更新对应会话的消息列表，并刷新会话列表的最后一条消息预览。

**验收标准：**

- 收到 `newUpdateMessage` 后消息立即插入列表
- 如果消息已存在（通过 `clientMsgId` 或 `id` 判断），则更新而非重复插入
- 会话列表的最后一条消息预览实时更新
- 会话列表按最新消息时间排序
- 未读数实时更新
- 消息插入后自动滚动到底部（如果用户已在底部）

## Web 适配要点

### 传输层替换

桌面端通过 IPC 调用主进程，Web 端通过 browser service 直接调用 NestJS API（见 [02_TRANSPORT_DATA.md](02_TRANSPORT_DATA.md)）。

### 文件来源差异

桌面端 `files` 参数为本地路径，Web 端为 `File` 对象，需在 browser service 层转换为 FormData 上传。

### 本地存储

桌面端使用 SQLite 存储消息，Web 端使用 IndexedDB 存储 pending 消息与上传任务，正式消息从服务端拉取后缓存到 IndexedDB。

### 组件复用

`EmojiPicker`、`ChatInput`、`MessageItem` 等前端组件可直接复用，仅需调整数据获取层从 IPC 改为 browser service。

### Socket 连接

Web 端通过 WebSocket 连接服务端，监听 `ackSendMessage`、`newUpdateMessage`、`ReadMessageResponse` 事件，实现与桌面端一致的实时能力。

## 任务拆分

### 客户端任务

- [ ] 实现文本消息发送，本地立即插入 pending 状态
- [ ] 监听 `ackSendMessage`，更新消息状态为 success 或 fail
- [ ] 实现 `MessageStatusIcon` 组件，展示 sending/success/fail/uploading 状态
- [ ] 实现失败消息重发功能，调用 `ResendMessage` 并传入 `clientMsgId`
- [ ] 实现已读回执，进入会话时调用 `ReadMessage`
- [ ] 监听 `ReadMessageResponse`，同步已读状态与未读数
- [ ] 实现历史消息分页加载，支持 `afterMsgId`/`beforeMsgId` 翻页
- [ ] 实现本地历史回退，网络失败时调用 `GetLocalMessageHistory`
- [ ] 实现消息按日期分组，复用 `MessageDate` 和 `MessageGroup` 组件
- [ ] 监听 `newUpdateMessage`，实时插入或更新消息
- [ ] 实现文本消息渲染组件（复用桌面端 `types/Text`）
- [ ] 实现图片消息渲染组件，支持 `mediaGroupId` 图片组展示
- [ ] 实现文件消息渲染组件，显示文件名、大小、类型图标
- [ ] 实现语音消息渲染组件，支持波形与播放（依赖 08）
- [ ] 实现视频消息渲染组件，显示缩略图与时长
- [ ] 实现 IndexedDB 存储层，缓存 pending 消息与历史消息
- [ ] 实现消息幂等逻辑，通过 `clientMsgId` 或 `id` 去重

## 阶段编排

### 阶段 0：消息数据形态确认

确认 `LocalMessageListItem` 结构、`MessageStatus`/`MessageType` 枚举、IPC 方法签名在 Web 端的映射关系；确认 IndexedDB schema 设计。

**产出：**

- `LocalMessageListItem` 类型定义复用 `packages/shared-types`
- IndexedDB schema 设计文档
- browser service 方法签名与 IPC 方法对齐

### 阶段 1：文本收发 + pending + ack

实现文本消息发送、本地 pending 插入、`ackSendMessage` 监听与状态更新。

**产出：**

- 能发送文本消息并立即显示 pending 状态
- 收到 ack 后状态正确更新为 success 或 fail
- `MessageStatusIcon` 组件正常展示状态图标

### 阶段 2：已读 + 历史分页 + 日期分组

实现已读回执、历史消息分页加载、本地回退、按日期分组展示。

**产出：**

- 进入会话时自动标记已读，未读数正确更新
- 向上滚动加载更早消息，向下滚动加载更新消息
- 消息按日期分组，日期分隔线正确显示
- 网络失败时自动回退到本地历史

### 阶段 3：媒体消息接入

接入图片、文件、视频、语音消息渲染组件，依赖上传链路（见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)）与语音消息（见 [08_VOICE_MESSAGE.md](08_VOICE_MESSAGE.md)）。

**产出：**

- 图片消息支持 `mediaGroupId` 图片组展示
- 文件消息显示文件名、大小、类型图标
- 视频消息显示缩略图与时长
- 语音消息支持波形与播放

### 阶段 4：实时更新与异常重发

实现 `newUpdateMessage` 监听与消息插入、失败消息重发、消息幂等逻辑。

**产出：**

- 对端发送消息后本端实时收到并显示
- 失败消息可点击重发，重发成功后状态更新
- 消息通过 `clientMsgId` 或 `id` 去重，不重复插入
- 会话列表最后一条消息预览实时更新

## 风险点

### pending 消息幂等

本地 pending 消息与服务端返回的正式消息需通过 `clientMsgId` 关联，避免重复插入。需在 `ackSendMessage` 和 `newUpdateMessage` 到达时正确匹配并替换 pending 消息。

### ack 与 newUpdateMessage 到达顺序

`ackSendMessage` 和 `newUpdateMessage` 可能乱序到达，需保证无论哪个先到，消息状态都能正确更新。建议以 `newUpdateMessage` 为准，`ackSendMessage` 仅用于快速反馈。

### 分页游标边界

`afterMsgId`/`beforeMsgId` 翻页时需正确处理边界情况：

- 第一页没有 `beforeMsgId`
- 最后一页没有 `afterMsgId`
- 中间页需同时支持向上向下翻页
- 分页参数与返回结果需保证不重复、不遗漏

### 媒体消息依赖上传链路

图片、文件、视频、语音消息依赖上传链路（见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)），需等待上传完成后才能发送正式消息。上传失败时需正确处理 pending 消息状态，允许用户重试。

### 日期分组性能

消息按日期分组需遍历消息列表，大量消息时可能影响性能。建议在消息插入时增量计算分组，而非每次渲染时重新计算。

### IndexedDB 容量限制

Web 端 IndexedDB 容量有限，需定期清理过期消息缓存，保留最近 N 天或 M 条消息。清理策略需与服务端历史拉取逻辑配合，避免清理后无法加载历史。
