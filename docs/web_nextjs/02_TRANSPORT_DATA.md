# 传输与数据底座需求分析与任务编排

## 背景

传输与本地缓存是所有功能模块的底座。会话列表、消息收发、群聊、文件上传等能力都建立在「与服务端的实时/请求通道」以及「本地数据读写」之上。

在 Electron 桌面端，这一层由主进程承担：渲染进程通过 IPC 把请求转发到主进程，主进程持有 Socket.IO、Axios 与 better-sqlite3，统一完成协议编解码、连接管理和本地落库，再把结果回传给渲染进程。链路为 `React → IPC → 主进程 → Axios/Socket.IO + Protobuf → NestJS`。

Web 端没有主进程这一层。浏览器侧需要重建一套等价的直连与缓存能力：由 browser service 模块直接持有 socket.io-client 与 Axios，复用 `shared-protobuf`，直连 NestJS；本地缓存从 SQLite 迁移到 IndexedDB。本文档定义这一底座的需求范围、Web 适配要点与任务编排，其余功能模块在此基础上展开。桌面端能力到 Web 的整体映射见 [09 桌面能力映射](09_DESKTOP_CAPABILITY_MAP.md)。

## 当前桌面端实现

### Socket 事件映射

客户端发送事件 `ClientToServiceEvent`：

```txt
ping, getUserInfo, getUserList, createConversation, sendMessage,
getConversationList, getMessageHistory, readMessage,
createGroup, getGroupDetail, updateGroup, inviteGroupMembers,
leaveGroup, dismissGroup
```

服务端响应事件 `ServiceToClientEvent`：

```txt
pong, error, getUserInfoResponse, getUserListResponse,
getConversationListResponse, getMessageHistoryResponse, ReadMessageResponse,
createGroupResponse, getGroupDetailResponse, groupOperationResponse,
ackSendMessage, newUpdateMessage, newConversation, sendFileUploadComplete
```

请求/响应配对 `ClientPaddingRequestsEvent`：

- `sendMessage` → `ackSendMessage`
- `getConversationList` → `getConversationListResponse`
- `getMessageHistory` → `getMessageHistoryResponse`
- `readMessage` → `ReadMessageResponse`
- `getUserList` → `getUserListResponse`
- `getUserInfo` → `getUserInfoResponse`
- `createGroup` → `createGroupResponse`
- `getGroupDetail` → `getGroupDetailResponse`
- `updateGroup` / `inviteGroupMembers` / `leaveGroup` / `dismissGroup` → `groupOperationResponse`
- `ping` → `pong`

`newUpdateMessage`、`newConversation`、`sendFileUploadComplete` 为服务端主动推送，不参与请求配对。

### Command 信封

所有 Socket 业务数据封装在统一信封中，Protobuf 二进制编码：

```proto
message Command {
  string event = 1;            // 事件名称
  string userId = 2;           // 用户ID
  string client = 3;           // 标识发送端设备类型
  string requestId = 4;
  repeated bytes payload = 5;  // 根据不同业务场景封装的具体数据结构
}
```

`event` 取自 `ClientToServiceEvent` / `ServiceToClientEvent`；`requestId` 用于请求/响应配对；`payload` 内层按各业务消息体（如 `SendMessageRequest`、`GetConversationListResponse`）二次编解码。

### HTTP

`apps/electron_client/src/utils/axios/` 提供统一的 Axios 实例：自动注入 token、统一错误处理，承载文件上传、鉴权等非实时请求。

### Socket

`apps/electron_client/src/utils/socket-io-client/` 管理 Socket.IO 连接：每个窗口独立连接、JWT 认证，负责 Command 编解码、requestId 回填与事件分发。

### 本地表

`apps/electron_client/src/db/` 下 `DatabaseManager.ts` 管理 SQLite（better-sqlite3），数据库路径 `userData/database/global.db`。类型定义在 `packages/shared-types/src/lib/db/`。核心表：

- `StoreTable`：token、用户信息等 KV 存储。
- `ConversationTable`：会话列表，元素类型 `LocalConversationListItem`。
- `MessageTable`：消息，元素类型 `LocalMessageListItem`，写入走 UPSERT 去重。
- `UploadTaskTable`：上传任务，归 [06 媒体上传](06_MEDIA_UPLOAD.md) 处理，本文档不展开。

`LocalMessageListItem` 关键字段：`id, conversationId, seq(bigint), clientMsgId, senderId, content, type, status, createTime, ...`。

`MessageStatus` 枚举：`default: 0, sending: 1, success: 2, uploading: 3, fail: -1`。

### IPC Proxy 入口

`shared-utils` 的 `ipc` Proxy（`lib/ipc/ipcClient.ts`、`ipcRenderer.ts`）对应 `window.c_chat.ipcCall`，是渲染进程访问主进程能力的唯一入口。上层页面通过该 Proxy 调用方法，底层传输与缓存细节对页面透明。

## Web 端目标

- 浏览器侧 browser service 模块直接持有 socket.io-client 与 Axios，不经过任何主进程中转，直连 NestJS。
- 复用 `shared-protobuf`：Command 信封与各业务消息体的编解码、`protoMap` 的事件映射在 Web 端原样使用，不另起一套协议。
- IndexedDB 复刻桌面端的 Store / Conversation / Message 三类数据，承担本地缓存与离线回退。
- 对外暴露与桌面端 IPC 方法签名一致的调用接口，让上层页面尽量无感地从「调用 `ipc` Proxy」切换到「调用 browser service」。

## 产品需求与验收

### Socket 直连与 Protobuf 编解码

browser service 在登录后用 JWT 与 NestJS 建立 socket.io-client 连接；客户端事件按 `ClientToServiceEvent` 与 `protoMap` 编码为 Command 二进制；服务端响应按 `requestId` 回填到对应请求；二进制 payload 在浏览器 socket.io transport 下正确收发。

验收标准：

- 登录态下能用 JWT 成功建连，未登录不建连。
- 发送 `ClientToServiceEvent` 中任一事件时，Command 的 `event`、`userId`、`requestId`、`payload` 字段填充正确。
- 内层 payload 按 `protoMap` 对应消息体编解码，与桌面端结果一致。
- 服务端响应能按 `requestId` 路由回发起方，不串号。
- 二进制 payload 在浏览器环境下收发无损，解码后字段完整。

### 请求/响应配对

复刻 `ClientPaddingRequestsEvent` 语义：`getXxx` 类请求发出后能等到对应的 `xxxResponse`；提供超时与 `error` 事件回退。

验收标准：

- 各配对按 `ClientPaddingRequestsEvent` 实现：`sendMessage→ackSendMessage`、`getConversationList→getConversationListResponse`、`getMessageHistory→getMessageHistoryResponse`、`readMessage→ReadMessageResponse`、`getUserList→getUserListResponse`、`getUserInfo→getUserInfoResponse`、`createGroup→createGroupResponse`、`getGroupDetail→getGroupDetailResponse`、`updateGroup/inviteGroupMembers/leaveGroup/dismissGroup→groupOperationResponse`、`ping→pong`。
- 发起请求返回 Promise，收到对应响应后 resolve。
- 超时未收到响应时 reject，并清理挂起的 requestId。
- 收到服务端 `error` 事件时，对应挂起请求按错误回退，不长期悬挂。
- `newUpdateMessage`、`newConversation`、`sendFileUploadComplete` 走推送分发，不进入请求配对队列。

### HTTP 客户端

Axios 实例自动注入 token，统一处理 401 等异常，`baseURL` 指向 NestJS。

验收标准：

- 请求自动携带当前 token。
- 401 等鉴权失败统一处理，触发登出或重新鉴权回退。
- `baseURL` 指向 NestJS 服务地址，可按环境配置。
- 错误结构与上层消费方约定一致，不在调用点重复处理。

### IndexedDB 缓存层

Store / Conversation / Message 三类数据在 IndexedDB 可读写；消息按 `conversationId + seq / clientMsgId` 去重，对应 SQLite 的 UPSERT 唯一索引；读取保留「服务端优先 → 本地回退」。

验收标准：

- Store 支持 token、用户信息等 KV 的读写与清除。
- Conversation 支持会话列表的读写与按会话 upsert。
- Message 写入按 `conversationId + seq / clientMsgId` 去重，重复写入更新而非新增。
- 字段与 `LocalConversationListItem`、`LocalMessageListItem` 对齐，`seq` 等大整数语义不丢失。
- 读取遵循「服务端优先 → 本地回退」：在线时以服务端数据为准并落库，离线或请求失败时回退本地缓存。

### 连接生命周期

覆盖登录建连、断线自动重连、登出销毁连接与敏感缓存。

验收标准：

- 登录成功后建立 Socket 连接并完成 JWT 认证。
- 断线后自动重连，重连成功后恢复事件订阅与挂起请求处理策略。
- 登出时销毁连接、清理挂起请求，并清除 token、用户信息等敏感缓存。
- 连接状态可被上层感知，用于驱动在线/离线 UI 表现。

## Web 适配要点

- `window.c_chat.ipcCall`（`ipc` Proxy）→ browser service 模块：上层调用入口从 IPC Proxy 切换为 browser service，方法签名保持一致。
- 主进程每窗口单连接 → 浏览器单连接：Web 一期按「单标签单账号」处理，一个标签页维护一条 Socket 连接。
- SQLite 同步查询 → IndexedDB 异步事务：所有本地读写改为基于 Promise 的异步事务，调用方需适配异步语义。
- better-sqlite3 唯一索引 UPSERT → IndexedDB `keyPath` + 手动 upsert：用对象仓库 `keyPath` 与索引约束承载去重键，写入时先查后写或用 `put` 完成 upsert。
- 多账号一期不复刻：Web 一期不实现多账号并存，相关取舍见 [09 桌面能力映射](09_DESKTOP_CAPABILITY_MAP.md)。

## 任务拆分

客户端任务：

- [ ] 搭建 browser service 骨架，对外暴露与 IPC 一致的方法签名。
- [ ] 接入 socket.io-client，完成 JWT 建连与认证。
- [ ] 接入 Protobuf 编解码，复用 `protoMap` 完成 Command 与各业务消息体的编解码。
- [ ] 实现请求/响应配对，复刻 `ClientPaddingRequestsEvent` 语义并处理超时与 `error` 回退。
- [ ] 接入 Axios，实现 token 注入与 401 统一处理，`baseURL` 指向 NestJS。
- [ ] 实现 IndexedDB 三类数据（Store / Conversation / Message）封装与去重 upsert。
- [ ] 实现「服务端优先 + 本地回退」读取策略。
- [ ] 实现连接生命周期：登录建连、断线重连、登出销毁连接与清理敏感缓存。

## 阶段编排

### 阶段 0：接口边界确认

确认 browser service 对外签名与桌面端 IPC 方法对齐，明确异步语义差异与一期不复刻的能力边界。

产出：browser service 对外接口清单与签名对齐 IPC 的结论。

### 阶段 1：Socket + Protobuf 直连打通

接入 socket.io-client 与 JWT 建连，复用 `protoMap` 完成 Command 编解码与 requestId 回填。

产出：可与服务端正确收发一条 `ping`/`pong`。

### 阶段 2：HTTP + token

接入 Axios，完成 token 注入、401 统一处理与 `baseURL` 配置。

产出：可在登录态下发起带 token 的 HTTP 请求并正确处理鉴权失败。

### 阶段 3：IndexedDB 缓存

实现 Store / Conversation / Message 三类数据封装、去重 upsert 与「服务端优先 + 本地回退」读取。

产出：三类数据可在 IndexedDB 读写，消息去重与回退读取可用。

### 阶段 4：生命周期与异常

实现断线重连、登出销毁连接与敏感缓存清理，补齐请求超时与 `error` 回退路径。

产出：连接生命周期与异常路径完整，登出后无连接与敏感缓存残留。

## 风险点

- Protobuf 二进制在浏览器 socket.io transport 下的兼容性需验证，避免 WebSocket 与 polling 回退场景下 `ArrayBuffer` / `Buffer` 处理不一致导致 payload 损坏。
- IndexedDB 异步事务与桌面端 SQLite 同步查询存在时序差异，原本同步读取后立即使用的逻辑需要改为等待 Promise，避免读到空结果或竞态。
- token 放 localStorage 存在 XSS 读取风险，需结合内容安全策略与登出清理控制暴露面。
- 单标签单账号限制下不支持多账号并存，多账号场景一期不复刻，详见 [09 桌面能力映射](09_DESKTOP_CAPABILITY_MAP.md)。
