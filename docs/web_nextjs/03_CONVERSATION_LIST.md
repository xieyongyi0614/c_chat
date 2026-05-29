# 会话列表需求分析与任务编排

## 背景

会话列表是聊天主界面左栏的核心入口，承载用户查看所有会话、筛选未读/私聊/群组、置顶重要会话、清零未读数等基础交互。桌面端已实现完整的会话列表能力，包括服务端分页拉取、本地缓存回退、实时推送 upsert、定时同步、folder 筛选、置顶排序与未读角标。Web 端需要一比一复刻这些能力，数据层从 IPC + SQLite 切换到 browser service + IndexedDB。

## 当前桌面端实现

### IPC 方法

桌面端渲染进程通过以下 IPC 方法与主进程交互，定义在 `packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`：

- `GetConversationList: IpcMethod<GetConversationListParams, ResponseList<LocalConversationListItem>>` — 分页拉取服务端会话列表，`GetConversationListParams` 继承自 `SocketTypes.RequestListParams`，包含 `pageSize`、`pageNum` 等分页参数。
- `GetLocalConversationList: IpcMethod<GetLocalConversationListParams | undefined, ResponseList<LocalConversationListItem>>` — 从本地 SQLite 读取缓存会话列表，用于离线回退或快速首屏展示。
- `CreateConversation: IpcMethod<CreateConversationParams, LocalConversationListItem>` — 创建私聊会话，`CreateConversationParams` 包含 `targetId: string`。

### 本地表结构

会话列表本地缓存在 SQLite `ConversationTable`，类型定义在 `packages/shared-types/src/lib/db/ConversationTable.ts`：

- `LocalConversationListItem` 字段：`id`（会话 ID）、`type`（会话类型，1 私聊 / 2 群聊）、`targetId`（私聊对端用户 ID 或群 ID）、`targetName`（对端昵称或群名）、`targetAvatar`（对端头像或群头像）、`lastMsgContent`（最后一条消息文案）、`lastMsgTime`（最后消息时间戳）、`updateTime`（会话更新时间）、`createTime`（会话创建时间）、`unreadCount`（未读数，可选）、`lastReadSeq`（已读位置，bigint）。
- `ConversationType` 枚举：`Single: 1`（私聊）、`Group: 2`（群聊）。

### 状态管理

桌面端会话列表状态在 `apps/frontend/src/stores/chat/chatStore.ts` 中维护：

- `selectedConversationFolder: 'all' | 'unread' | 'personal' | 'groups' | 'archive'` — 当前选中的 folder，五个值分别对应全部、未读、私聊、群组、归档。
- `pinConversation` — 置顶逻辑：新消息到达时，会话被置顶到列表前部（非置顶区首部）。
- `upsertAndPinConversation` — 会话 upsert 与置顶：收到新消息或新会话推送时，本地列表先过滤掉旧记录，再将新记录插入列表首部；如果当前选中该会话且未读数大于 0，则本地立即清零未读并防抖调用 `markConversationAsRead`。
- `markConversationAsRead` — 未读清零：进入会话时本地立即清零未读数，防抖 800ms 后调用 `ipc.ReadMessage` 同步服务端已读位置。

### 组件结构

桌面端会话列表相关组件位于 `apps/frontend/src/pages/chats/components/left/`：

- `ConversationList.tsx` — 会话列表容器，渲染 `ConversationItem` 列表，处理选中与滚动。
- `ConversationItem.tsx` — 单个会话项，展示头像、名称、最后消息、时间、未读角标。
- `LeftColumn.tsx` — 左栏容器，包含 `LeftColumnHeader` 与 `ConversationList`。
- `LeftColumnHeader.tsx` — 左栏头部，包含 folder 筛选按钮（全部/未读/私聊/群组/归档）。

### 数据获取

桌面端会话列表数据获取逻辑在 `apps/frontend/src/pages/chats/hooks/useConversationData.ts`：

- 进入聊天页时并行触发本地缓存读取与服务端请求，服务端数据优先，本地缓存用于快速首屏展示。
- 页面可见时每 30 秒同步一次服务端数据，用于补齐离线期间被拉群、群资料变更、新会话等。
- 页面从不可见变为可见时立即同步一次。
- 使用 `requestSeqRef` 与 `remoteResolvedRef` 避免过期回包污染当前数据：每次用户切换时自增 `requestSeqRef`，服务端数据返回后设置 `remoteResolvedRef` 为 true，后到的本地缓存回包被忽略。

### 推送事件

桌面端通过 Socket 推送事件实时更新会话列表，事件定义在 `packages/shared-protobuf/src/protoMap.ts`：

- `newConversation` — 新会话推送，服务端在创建会话、被拉群等场景下推送 `ConversationInfo`，客户端收到后 upsert 本地会话列表。
- `newUpdateMessage` — 新消息推送，服务端在收到新消息时推送 `NewUpdateMessage`，客户端收到后 upsert 会话列表（更新 `lastMsgContent`、`lastMsgTime`、`unreadCount`）并置顶该会话。

### 定时同步

桌面端会话列表定时同步策略：

- 进入聊天页时同步一次。
- 页面可见时每 30 秒同步一次。
- 页面从不可见变为可见时立即同步一次。

## Web 端目标

Web 端一比一复刻桌面端会话列表能力：

- 列表展示：私聊显示对端 `targetInfo`（昵称、头像），群聊显示群名、群头像。
- folder 筛选：全部、未读、私聊（`type=1`）、群组（`type=2`）、归档五个 folder 正确过滤会话。
- 置顶与排序：新消息到达时会话置顶到列表前部（非置顶区首部）。
- 未读数：按会话维护未读数，进入会话时清零，未读角标显示。
- 新会话推送：收到 `newConversation` 或 `newUpdateMessage` 时本地列表 upsert。
- 定时同步：进入聊天页、页面可见、每 30 秒各同步一次，补齐离线期间被拉群、资料变更等。
- 数据层：IPC → browser service，SQLite → IndexedDB。

## 产品需求与验收

### 会话列表展示

会话列表展示私聊与群聊，私聊显示对端用户信息，群聊显示群信息。

验收标准：

- 私聊会话（`type=1`）展示对端 `targetName`、`targetAvatar`。
- 群聊会话（`type=2`）展示群名 `targetName`、群头像 `targetAvatar`。
- 最后一条消息文案统一：文本消息保留原内容，图片消息显示 `[图片]`，视频消息显示 `[视频]`，文件消息显示 `[文件]`，音频消息显示 `[音频]`。
- 时间格式化：今天显示 `HH:mm`，昨天显示 `昨天`，本周显示星期，更早显示 `MM/DD`。
- 空会话列表展示空状态提示。

### folder 筛选

左栏头部提供五个 folder 筛选按钮，点击后列表只展示对应类型会话。

验收标准：

- 全部（`all`）：展示所有会话。
- 未读（`unread`）：展示 `unreadCount > 0` 的会话。
- 私聊（`personal`）：展示 `type === 1` 的会话。
- 群组（`groups`）：展示 `type === 2` 的会话。
- 归档（`archive`）：一期不实现归档能力，按钮保留但点击后展示空列表或提示"归档功能开发中"。

### 置顶与排序

新消息到达时会话置顶到列表前部，保持最近活跃会话在顶部。

验收标准：

- 收到 `newUpdateMessage` 时，对应会话从列表中移除并插入列表首部。
- 收到 `newConversation` 时，新会话插入列表首部。
- 列表按 `updateTime` 或 `lastMsgTime` 降序排列，最近活跃会话在顶部。
- 一期不实现手动置顶能力，只做新消息自动置顶。

### 未读数

按会话维护未读数，进入会话时清零，未读角标显示。

验收标准：

- 会话列表项展示未读角标，`unreadCount > 0` 时显示未读数，`unreadCount === 0` 时不显示。
- 点击会话进入聊天时，本地立即清零未读数，防抖 800ms 后调用 browser service 的 `ReadMessage` 同步服务端已读位置。
- 收到 `newUpdateMessage` 时，如果当前选中该会话，本地立即清零未读并防抖调用 `ReadMessage`；否则未读数按服务端推送的 `unreadCount` 更新。
- 未读数按服务端口径维护，不能纯客户端自增。

### 新会话推送

收到 `newConversation` 或 `newUpdateMessage` 时本地列表 upsert。

验收标准：

- 收到 `newConversation` 推送时，本地会话列表 upsert 该会话并置顶。
- 收到 `newUpdateMessage` 推送时，本地会话列表 upsert 该会话（更新 `lastMsgContent`、`lastMsgTime`、`unreadCount`）并置顶。
- upsert 逻辑：如果会话已存在，合并新旧数据；如果会话不存在，插入新会话。
- 推送事件在 browser service 中注册监听，收到后调用 `chatStore.upsertAndPinConversation`。

### 定时同步

进入聊天页、页面可见、每 30 秒各同步一次，补齐离线期间被拉群、资料变更等。

验收标准：

- 进入聊天页时并行触发本地缓存读取与服务端请求，服务端数据优先。
- 页面可见时每 30 秒同步一次服务端数据。
- 页面从不可见变为可见时立即同步一次。
- 使用 `requestSeqRef` 与 `remoteResolvedRef` 避免过期回包污染当前数据。
- 同步时调用 browser service 的 `GetConversationList`，返回后更新 `chatStore.conversationData`。

## Web 适配要点

- IPC → browser service：桌面端通过 `ipc.GetConversationList` / `ipc.GetLocalConversationList` / `ipc.CreateConversation` 调用主进程方法，Web 端改为调用 browser service 的同名方法，方法签名保持一致。
- SQLite → IndexedDB：桌面端会话列表缓存在 SQLite `ConversationTable`，Web 端改为 IndexedDB `conversation` 对象仓库，字段与 `LocalConversationListItem` 对齐。
- 可见性监听：桌面端使用 `document.visibilitychange` 监听页面可见性，Web 端复用该事件。
- 单标签单账号：Web 一期按单标签单账号处理，一个标签页维护一份会话列表，不考虑多标签同步。

## 任务拆分

客户端任务：

- [ ] 实现 browser service 的 `GetConversationList` 方法，调用 Socket 请求 `getConversationList` 并等待 `getConversationListResponse`，返回 `ResponseList<LocalConversationListItem>`。
- [ ] 实现 browser service 的 `GetLocalConversationList` 方法，从 IndexedDB `conversation` 对象仓库读取缓存会话列表，返回 `ResponseList<LocalConversationListItem>`。
- [ ] 实现 browser service 的 `CreateConversation` 方法，调用 Socket 请求 `createConversation` 并等待 `newConversation` 推送，返回 `LocalConversationListItem`。
- [ ] 实现 IndexedDB `conversation` 对象仓库，字段与 `LocalConversationListItem` 对齐，支持按 `id` 去重 upsert。
- [ ] 实现会话列表组件，复用桌面端 `ConversationList.tsx` / `ConversationItem.tsx` / `LeftColumn.tsx` / `LeftColumnHeader.tsx`，调用 browser service 替换 IPC。
- [ ] 实现 folder 筛选逻辑，按 `selectedConversationFolder` 过滤会话列表。
- [ ] 实现置顶排序逻辑，收到 `newUpdateMessage` / `newConversation` 时调用 `chatStore.upsertAndPinConversation`。
- [ ] 实现未读角标显示，`unreadCount > 0` 时显示未读数。
- [ ] 实现未读清零逻辑，进入会话时本地立即清零未读并防抖调用 browser service 的 `ReadMessage`。
- [ ] 实现 `newConversation` 推送监听，收到后调用 `chatStore.upsertAndPinConversation`。
- [ ] 实现 `newUpdateMessage` 推送监听，收到后调用 `chatStore.upsertAndPinConversation`。
- [ ] 实现定时同步逻辑，进入聊天页、页面可见、每 30 秒各同步一次，调用 browser service 的 `GetConversationList`。
- [ ] 实现服务端优先 + 本地回退读取策略，进入聊天页时并行触发本地缓存读取与服务端请求，服务端数据优先。

## 阶段编排

### 阶段 0：数据形态确认

确认 `LocalConversationListItem` 字段与桌面端对齐，明确 IndexedDB `conversation` 对象仓库结构与去重键。

产出：

- IndexedDB `conversation` 对象仓库结构确认，`keyPath` 为 `id`。
- `LocalConversationListItem` 字段与桌面端对齐，`seq` 等大整数语义不丢失。

### 阶段 1：列表展示 + 本地回退

实现会话列表组件与本地缓存读取，能看到会话列表。

产出：

- 会话列表组件可渲染，展示私聊与群聊。
- browser service 的 `GetLocalConversationList` 可从 IndexedDB 读取缓存会话列表。
- 进入聊天页时能看到本地缓存的会话列表。

### 阶段 2：folder + 置顶 + 未读

实现 folder 筛选、置顶排序、未读角标与清零。

产出：

- folder 筛选按钮可点击，列表按 folder 过滤。
- 新消息到达时会话置顶到列表前部。
- 未读角标显示，进入会话时清零。

### 阶段 3：推送 upsert + 定时同步

实现 `newConversation` / `newUpdateMessage` 推送监听与定时同步。

产出：

- 收到 `newConversation` / `newUpdateMessage` 时本地列表 upsert。
- 进入聊天页、页面可见、每 30 秒各同步一次服务端数据。
- 服务端优先 + 本地回退读取策略可用。

## 风险点

- 未读数需按服务端口径维护，不能纯客户端自增：客户端收到 `newUpdateMessage` 时，未读数按服务端推送的 `unreadCount` 更新，不能在客户端自增 `unreadCount + 1`，避免与服务端未读数不一致。
- 定时同步与实时推送的 upsert 竞态：定时同步与 `newUpdateMessage` 推送可能同时到达，需要保证 upsert 逻辑幂等，避免重复插入或丢失更新。建议按 `updateTime` 或 `lastMsgTime` 比较，只保留最新数据。
- 归档/置顶状态本地与服务端一致性：一期不实现归档与手动置顶能力，归档 folder 按钮保留但点击后展示空列表；二期实现时需要同步服务端归档/置顶状态，避免客户端与服务端状态不一致。
- IndexedDB 异步事务与桌面端 SQLite 同步查询存在时序差异：原本同步读取后立即使用的逻辑需要改为等待 Promise，避免读到空结果或竞态。
- `requestSeqRef` 与 `remoteResolvedRef` 需要在 Web 端复刻：避免用户切换或过期回包污染当前数据。
