# 网络与缓存底座需求分析与任务编排

## 背景

网络与本地缓存是 Web 端所有 IM 功能的底座。认证、会话列表、消息收发、群聊、媒体上传都依赖统一的 HTTPS、WebSocket、协议编解码、token 管理和本地缓存能力。

当前仓库已经有 `packages/shared-api`，它就是跨端 HTTPS 与 WebSocket 请求底座。Web 端需要做的是给 `shared-api` 注入浏览器运行时 adapter，并补齐 IndexedDB 缓存，不是重新写一套网络层。

## 当前基础

### 已有能力

- `packages/shared-api/src/createApiClient.ts`：创建 `HttpClient`、`AuthService`、`UploadService`。
- `packages/shared-api/src/http/httpClient.ts`：封装 Axios、token 注入、错误上报、multipart 上传。
- `packages/shared-api/src/realtime/realtimeClient.ts`：封装 socket.io-client、JWT 建连、心跳、重连、销毁。
- `packages/shared-api/src/realtime/messageRegistry.ts`：封装 Command 编解码、请求/响应配对、推送订阅。
- `packages/shared-protobuf/src/protoMap.ts`：定义 `ClientToServiceEvent`、`ServiceToClientEvent`、`ClientPaddingRequestsEvent` 和消息体映射。
- `packages/shared-types`：已有 HTTP、Socket、上传、会话、消息、本地表类型。
- Electron 端已有 SQLite 本地表：Store、Conversation、Message、UploadTask。

### 主要缺口

- Web 端还没有明确的 `shared-api` 浏览器运行时注入方案，例如 `TokenProvider`、`IdentityProvider`、`ClientInfo`、`ConnectionObserver`。
- Web 端还没有 IndexedDB Store / Conversation / Message / UploadTask 缓存规范。
- `shared-api` 目前已有认证和上传 service，但会话、消息、群聊等业务 service 需要确认是否补齐在 `shared-api`，不能散落在页面层。
- Electron IPC 方法和 Web 端共享 API 方法之间需要建立迁移映射，避免上层组件直接关心协议细节。

## 目标

### 一期目标

- Web 端统一通过 `shared-api` 访问 HTTPS 和 WebSocket。
- WebSocket 协议统一通过 `shared-protobuf`，不手写 payload。
- Web 端运行时只负责注入浏览器 adapter：token、用户身份、客户端信息、错误上报、连接状态。
- Web 本地缓存统一使用 IndexedDB，字段对齐 `shared-types` 中现有本地表类型。
- 会话、消息、群聊等业务调用如果缺 service，优先扩展 `shared-api`。

### 二期方向

- 多标签同步、BroadcastChannel、Service Worker Push、离线队列可作为二期专项。
- 如果支持多账号，IndexedDB 数据库名、token 和连接实例需要按账号隔离。

## 产品需求

### shared-api Web 运行时接入

Web 应用启动时创建一份 API client 实例，注入浏览器侧 adapter。

验收标准：

- `createApiClient` 可在浏览器运行时创建 HTTP client。
- `RealtimeClient` 可在浏览器运行时建立 socket.io 连接。
- `TokenProvider` 从 Web 持久化存储读取 token。
- `IdentityProvider` 返回当前用户 ID 和客户端标识。
- `ConnectionObserver` 能把连接、断线、重连、错误状态通知到 UI。
- 网络错误统一交给 `ErrorReporter`，页面不重复解析 Axios 错误结构。

### shared-protobuf 协议复用

WebSocket 请求、响应和服务端推送都必须走 `shared-protobuf`。

验收标准：

- 发送事件使用 `ClientToServiceEvent`。
- 响应事件使用 `ServiceToClientEvent`。
- 请求/响应配对使用 `ClientPaddingRequestsEvent`。
- Command 信封字段 `event`、`userId`、`client`、`requestId`、`payload` 与桌面端一致。
- 新增协议时先更新 `Chat.proto` 和 `protoMap`，再更新业务调用。

### IndexedDB 缓存

Web 端用 IndexedDB 替代 Electron SQLite，保留服务端优先、本地回退体验。

验收标准：

- Store 缓存 token、当前用户、运行时配置等轻量 KV。
- Conversation 缓存会话列表，字段对齐 `LocalConversationListItem`。
- Message 缓存消息历史和 pending 消息，字段对齐 `LocalMessageListItem`。
- UploadTask 缓存上传任务元信息，字段对齐上传任务类型。
- 写入支持按主键 upsert，避免重复消息和重复会话。
- 在线时以服务端数据为准并落库，离线或失败时回退本地缓存。

### 连接生命周期

登录、断线、重连、登出都需要有明确生命周期。

验收标准：

- 登录成功后初始化 API client 和 RealtimeClient。
- 断线后由 `RealtimeClient` 重连策略处理，不在页面里重复实现。
- 重连成功后恢复推送监听。
- 登出时销毁 RealtimeClient、清理挂起请求、清理敏感缓存。
- 连接状态能被会话列表、消息输入区等模块读取。

### 业务 service 边界

页面不直接拼 socket 事件和 protobuf 消息体，业务调用沉淀到 `shared-api`。

验收标准：

- 认证调用走 `AuthService`。
- 上传调用走 `UploadService`。
- 会话、消息、群聊如缺少 service，应在 `shared-api` 内新增对应 service。
- 页面层只调用业务方法，不直接操作 `genericRequest`，除非是在 service 内部。
- service 返回类型复用 `shared-types`，不新增 Web 专用响应结构。

## Web 适配要点

- Electron IPC proxy 不迁移到 Web；Web 端直接使用 `shared-api` 暴露的业务方法。
- Web 端只补 adapter 和缓存，不重复写 HTTP/WebSocket 客户端。
- IndexedDB 是异步事务，调用方必须按 Promise 处理，不能保留 SQLite 同步读取假设。
- token 一期可用 localStorage 或 IndexedDB；如后续改 httpOnly cookie，需要同步调整 `TokenProvider`。
- Web 一期按单标签单账号处理，多标签同步不进入一期。

## 任务编排

### 阶段 0：共享边界确认

目标：定清楚 Web 端只接入 `shared-api`，不重复造网络层。

- [x] 确认 Web 端 HTTPS 请求统一走 `packages/shared-api`。
- [x] 确认 WebSocket 请求和推送统一走 `RealtimeClient`。
- [x] 确认协议新增统一走 `packages/shared-protobuf`。
- [x] 确认页面层不直接拼 socket event 和 protobuf payload。
- [x] 确认缺失业务 service 时扩展 `shared-api`。

产出：

- Web 网络层职责边界明确。

### 阶段 1：浏览器 adapter

目标：让 `shared-api` 能在 Web 运行时使用。

- [x] 实现 Web 端 `TokenProvider`。
- [x] 实现 Web 端 `IdentityProvider`。
- [x] 实现 Web 端 `ClientInfo`。
- [x] 实现 Web 端 `ErrorReporter`。
- [x] 实现 Web 端 `ConnectionObserver`。
- [x] 用 `createApiClient` 创建 Web API client 单例。

产出：

- Web 端可以通过 `shared-api` 发送带 token 的 HTTP 请求。

### 阶段 2：RealtimeClient 接入

目标：打通 WebSocket + protobuf 主链路。

- [x] 使用 Web adapter 创建 `RealtimeClient`。
- [x] 登录后建立 socket 连接。
- [x] 验证 `ping -> pong` 请求配对。
- [x] 注册 `newUpdateMessage`、`newConversation` 等服务端推送监听。
- [x] 登出时销毁连接并清理挂起请求。

产出：

- Web 端可以收发 protobuf socket 消息。

### 阶段 3：IndexedDB 缓存

目标：建立 Web 本地缓存底座。

- [x] 定义 Store 对象仓库。
- [x] 定义 Conversation 对象仓库。
- [x] 定义 Message 对象仓库。
- [x] 定义 UploadTask 对象仓库。
- [x] 实现按主键 upsert。
- [x] 实现服务端优先、本地回退读取策略。

产出：

- Web 端具备会话、消息、上传任务本地缓存能力。

### 阶段 4：业务 service 补齐

目标：把页面需要的业务调用沉淀到 `shared-api`。

- [x] 核对认证 service 是否满足 Web 登录、注册、资料编辑。
- [x] 核对上传 service 是否满足 File API 分片上传。
- [x] 补齐会话 service：会话列表、本地会话、创建会话、已读。
- [x] 补齐消息 service：发送、重发、历史、推送订阅。
- [x] 补齐群聊 service：创建群、详情、更新、邀请、退出、解散。

产出：

- Web 页面可以通过 service 完成业务调用，不关心 socket 细节。

## 风险点

- 绕过 `shared-api` 写 Web 专用请求层会造成桌面端和 Web 端行为分叉。
- 直接在页面层使用 `genericRequest` 会让协议细节散落，后续维护困难。
- IndexedDB 无法像 SQLite 一样同步读取，首屏和回退逻辑需要处理异步时序。
- token 存储在浏览器有 XSS 风险，需要配合 CSP 和登出清理。
- 多标签同时登录同一账号会产生连接和缓存竞争，一期先不处理。
