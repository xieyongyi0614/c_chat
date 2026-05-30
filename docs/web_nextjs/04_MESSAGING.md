# 消息收发需求分析与任务编排

## 背景

消息收发是 IM 的主干能力，覆盖文本、图片、文件、视频、语音、pending 状态、ack、失败重发、已读、历史分页和实时推送。Web 端需要复刻桌面端的用户体验，但底座必须走 `shared-api`、`shared-protobuf`、`shared-types` 和 IndexedDB。

## 当前基础

### 已具备

- `shared-protobuf` 已有 `sendMessage`、`ackSendMessage`、`newUpdateMessage`、`getMessageHistory`、`readMessage` 等协议事件。
- `shared-types` 已有 `LocalMessageListItem`、`MessageStatus`、消息类型、历史分页参数等类型。
- 桌面端已有消息分组、日期分隔、状态图标、文本/图片/文件/音频/视频消息组件。
- 媒体上传方案已明确采用 complete 后服务端建消息，见 [06 媒体上传](06_MEDIA_UPLOAD.md)。
- 语音录音和播放由 [08 语音消息](08_VOICE_MESSAGE.md) 承担。

### 主要缺口

- Web 端需要在 `shared-api` 内补齐消息 service：发送、重发、历史、已读、推送订阅。
- Web 端需要定义 IndexedDB message store。
- Web 端需要处理 ack 与 `newUpdateMessage` 乱序。
- Web 端媒体消息不能依赖本地路径，需要和上传模块使用 File/Blob。

## 目标

### 一期目标

- 支持文本消息发送、接收、失败重发。
- 支持图片、文件、视频、语音消息的展示和发送入口。
- 支持本地 pending 消息和状态流转。
- 支持消息历史分页和本地回退。
- 支持已读同步和会话未读联动。
- 支持实时 `newUpdateMessage` 插入或更新消息。

### 二期方向

- 回复、引用、撤回、编辑。
- @、表情回应、消息搜索。
- 群消息已读人数。
- 大量消息虚拟列表优化。

## 产品需求

### 文本消息

用户输入文本后发送，消息立即出现在本地列表，随后根据 ack 和服务端推送更新状态。

验收标准：

- 空文本不可发送。
- 发送后生成 `clientMsgId`。
- 本地立即插入 sending 状态消息。
- 收到 `ackSendMessage` 后更新为 success 或 fail。
- 收到 `newUpdateMessage` 后以服务端消息为准覆盖本地 pending。
- 失败消息可重发。

### 媒体消息

图片、文件、视频和语音通过上传链路提交，服务端完成后直接创建消息。

验收标准：

- 选择媒体后本地展示 uploading / pending 状态。
- 上传进度可见。
- 上传完成后通过 `newUpdateMessage` 得到正式消息。
- 客户端不在 complete 后二次调用 `sendMessage`。
- 图片消息支持 `mediaGroupId` 分组展示。
- 文件消息展示文件名、大小和类型。
- 视频消息展示缩略图或基础播放入口。
- 语音消息展示时长和波形。

### 消息状态流转

消息状态需要清晰反映 sending、uploading、success、fail。

验收标准：

- sending 展示发送中状态。
- uploading 展示上传进度。
- success 展示成功状态或不展示额外干扰。
- fail 展示失败状态和重试入口。
- 重发使用原 `clientMsgId` 或明确的重发协议，避免重复消息。
- ack 和推送乱序时最终状态一致。

### 历史消息

进入会话时加载最新消息，滚动时分页加载历史。

验收标准：

- 首次进入会话加载最新一页。
- 向上滚动加载更早消息。
- 支持 before/after 游标或当前后端约定的分页参数。
- 网络失败时回退 IndexedDB 本地历史。
- 重复分页不会插入重复消息。
- 空历史展示 empty 状态。

### 已读同步

用户阅读消息后同步已读位置，并联动会话列表未读数。

验收标准：

- 进入会话后调用已读同步。
- 滚动到底部或收到当前会话消息时可同步最新已读。
- 服务端返回 `lastReadSeq` 后更新本地会话。
- 会话列表未读数同步清零。
- 已读请求失败时不影响继续阅读，后续同步修正。

### 消息展示

消息在聊天窗口按日期和发送者分组展示。

验收标准：

- 消息按时间顺序展示。
- 日期分隔线显示今天、昨天或具体日期。
- 同一发送者连续消息可合并展示。
- 自己和他人的消息气泡区分。
- 图片、视频、文件、语音组件复用已有桌面端设计思路和 `chat_ui` 基础组件。

## Web 适配要点

- 消息 service 放在 `shared-api`，页面不直接拼 `sendMessage` protobuf 请求。
- Web 本地消息缓存放 IndexedDB message store，字段对齐 `LocalMessageListItem`。
- File/Blob/object URL 替代 `filePath`，媒体消息依赖 [06 媒体上传](06_MEDIA_UPLOAD.md)。
- 语音消息依赖 [08 语音消息](08_VOICE_MESSAGE.md)。
- UI 使用 `chat_ui` / shadcn：Button、ScrollArea、Tooltip、Avatar、Spinner、Alert、Dialog 等。
- 不新增 mock 消息或临时 UI 冒充真实链路。

## 任务编排

### 阶段 0：消息契约确认

目标：确认消息类型、状态和分页契约。

- [ ] 确认 `LocalMessageListItem` 字段。
- [ ] 确认 `MessageStatus` 状态含义。
- [ ] 确认文本消息发送入参和返回。
- [ ] 确认媒体消息由上传 complete 后服务端建消息。
- [ ] 确认历史分页参数和返回结构。
- [ ] 确认已读接口返回 `lastReadSeq` 和 `unreadCount`。

产出：

- 消息数据和状态机明确。

### 阶段 1：shared-api 消息 service

目标：补齐消息调用入口。

- [ ] 新增或确认发送文本消息方法。
- [ ] 新增或确认失败重发方法。
- [ ] 新增或确认获取历史消息方法。
- [ ] 新增或确认本地历史读取方法。
- [ ] 新增或确认已读同步方法。
- [ ] 新增推送订阅封装，订阅 `ackSendMessage`、`newUpdateMessage`、`ReadMessageResponse`。

产出：

- 页面可通过 service 完成消息收发和历史读取。

### 阶段 2：IndexedDB 消息缓存

目标：支持 pending、历史和离线回退。

- [ ] 建立 message 对象仓库。
- [ ] 设计按 `id`、`clientMsgId`、`conversationId` 的索引。
- [ ] 实现消息 upsert。
- [ ] 实现 pending 消息写入。
- [ ] 实现服务端消息覆盖 pending。
- [ ] 实现历史分页本地读取。

产出：

- 消息可缓存、去重和本地回退。

### 阶段 3：文本消息闭环

目标：先完成最小可用消息链路。

- [ ] 实现输入框发送文本。
- [ ] 本地插入 sending 消息。
- [ ] 监听 ack 更新状态。
- [ ] 监听 `newUpdateMessage` 覆盖正式消息。
- [ ] 实现失败状态和重发。

产出：

- 用户可发送和接收文本消息。

### 阶段 4：历史、已读和展示

目标：补齐阅读体验。

- [ ] 进入会话加载最新消息。
- [ ] 向上滚动分页加载历史。
- [ ] 网络失败回退本地历史。
- [ ] 实现日期分组。
- [ ] 实现同发送者合并展示。
- [ ] 进入会话同步已读。
- [ ] 已读结果联动会话列表未读数。

产出：

- 消息历史和已读体验可用。

### 阶段 5：媒体消息接入

目标：接入图片、文件、视频、语音。

- [ ] 图片消息接入上传和展示。
- [ ] 文件消息接入上传和展示。
- [ ] 视频消息接入上传和展示。
- [ ] 语音消息接入录音、上传和展示。
- [ ] 支持 `mediaGroupId` 图片组。
- [ ] 上传完成后用服务端推送覆盖本地 pending。

产出：

- 现有消息类型在 Web 端可用。

## 风险点

- ack 和 `newUpdateMessage` 可能乱序，最终应以服务端正式消息为准。
- pending 与正式消息必须通过 `clientMsgId` 等字段关联，避免重复插入。
- 媒体消息不能 complete 后二次 sendMessage，否则会双发。
- 历史分页游标需要严格按后端契约，不要前端自行猜测。
- 大量消息可能影响渲染性能，虚拟列表可作为二期优化。
