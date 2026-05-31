# 任务报告：02_TRANSPORT_DATA.md - 网络与缓存底座

## 任务概述

完成 Web 端网络与缓存底座的实现，统一使用 `shared-api` 的 `RealtimeClient` 和 `HttpClient`，建立 IndexedDB 本地缓存，重构现有服务层。

## 修改文件

### 新增文件
- `apps/web/lib/api/client.ts` - 统一的 API 客户端配置，包含所有 adapter 和 RealtimeClient 初始化

### 修改文件
- `apps/web/lib/db/index.ts` - 添加 UploadTask 表和相关操作方法
- `apps/web/lib/services/http.service.ts` - 重构为重新导出统一客户端
- `apps/web/lib/services/auth.service.ts` - 重构使用 RealtimeClient 和统一客户端
- `apps/web/lib/services/conversation.service.ts` - 重构使用 RealtimeClient
- `apps/web/lib/services/message.service.ts` - 重构使用 RealtimeClient
- `apps/web/lib/services/index.ts` - 移除旧的 socketService 导出
- `apps/web/app/chats/page.tsx` - 添加 RealtimeClient 监听器初始化
- `docs/web_nextjs/02_TRANSPORT_DATA.md` - 更新任务完成状态

### 删除文件
- `apps/web/lib/services/socket.service.ts` - 删除自定义 SocketService，使用 shared-api 的 RealtimeClient

## 关键修改

### 1. 统一 API 客户端（apps/web/lib/api/client.ts）

创建了统一的 API 客户端配置文件，实现了所有必要的 adapter：

- **TokenProvider**: 从 IndexedDB 读取 token
- **IdentityProvider**: 提供用户 ID 和客户端标识（'web'）
- **ClientInfo**: 提供客户端名称、版本和平台信息
- **ErrorReporter**: 处理 401 错误，自动清理 token 并跳转登录页
- **ConnectionObserver**: 监听连接状态变化（断线、重连、错误）

提供了三个核心函数：
- `initRealtimeClient()`: 初始化并连接 RealtimeClient
- `getRealtimeClient()`: 获取当前 RealtimeClient 实例
- `destroyRealtimeClient()`: 销毁 RealtimeClient 并清理资源

### 2. IndexedDB 缓存扩展

在 `apps/web/lib/db/index.ts` 中：

- 添加了 `UploadTask` 接口和表结构
- 实现了 `UploadTaskDB` 类，提供完整的上传任务缓存操作
- 使用 Dexie 的版本迁移机制（version 2）添加新表

### 3. 服务层重构

#### AuthService
- 使用 `shared-api` 的 `authService` 进行 HTTP 认证请求
- 登录/注册成功后调用 `initRealtimeClient()` 建立 WebSocket 连接
- 登出时调用 `destroyRealtimeClient()` 清理连接和缓存
- `getUserList` 方法使用 `RealtimeClient.genericRequest` 发送 WebSocket 请求

#### ConversationService
- 所有 WebSocket 请求通过 `RealtimeClient.genericRequest` 发送
- 使用 `subscribeToEvent` 订阅 `newConversation` 推送
- 网络失败时自动回退到本地 IndexedDB 缓存

#### MessageService
- 所有 WebSocket 请求通过 `RealtimeClient.genericRequest` 发送
- 使用 `subscribeToEvent` 订阅 `ackSendMessage` 和 `newUpdateMessage` 推送
- 消息发送失败时更新本地状态为 `fail`
- 网络失败时自动回退到本地 IndexedDB 缓存

### 4. 页面层更新

- `apps/web/app/chats/page.tsx`: 在加载会话列表前调用 `initializeRealtimeListeners()` 初始化推送监听
- 登录和注册页面已经在成功后调用 `initializeRealtimeListeners()`

## 架构改进

### 之前的问题
1. 自定义的 `SocketService` 重复实现了 `shared-api` 已有的功能
2. 违反了项目约定：必须使用 `shared-api` 的 `RealtimeClient`
3. 缺少完整的 adapter 实现（IdentityProvider、ConnectionObserver）
4. 缺少 UploadTask 缓存表

### 现在的架构
1. ✅ 统一使用 `shared-api` 的 `RealtimeClient` 和 `HttpClient`
2. ✅ 完整实现了所有必要的浏览器 adapter
3. ✅ 建立了完整的 IndexedDB 缓存体系（Store、Conversation、Message、UploadTask）
4. ✅ 服务层只调用业务方法，不直接操作 protobuf 和 socket
5. ✅ 网络失败时自动回退到本地缓存
6. ✅ 连接生命周期管理清晰（登录建连、登出销毁）

## 检查结果

### 类型检查
```bash
cd apps/web && pnpm typecheck
```
✅ 通过，无类型错误

### 代码规范检查
```bash
pnpm lint
```
✅ 通过，无 lint 错误

## 任务完成情况

### 阶段 0：共享边界确认 ✅
- [x] 确认 Web 端 HTTPS 请求统一走 `packages/shared-api`
- [x] 确认 WebSocket 请求和推送统一走 `RealtimeClient`
- [x] 确认协议新增统一走 `packages/shared-protobuf`
- [x] 确认页面层不直接拼 socket event 和 protobuf payload
- [x] 确认缺失业务 service 时扩展 `shared-api`

### 阶段 1：浏览器 adapter ✅
- [x] 实现 Web 端 `TokenProvider`
- [x] 实现 Web 端 `IdentityProvider`
- [x] 实现 Web 端 `ClientInfo`
- [x] 实现 Web 端 `ErrorReporter`
- [x] 实现 Web 端 `ConnectionObserver`
- [x] 用 `createApiClient` 创建 Web API client 单例

### 阶段 2：RealtimeClient 接入 ✅
- [x] 使用 Web adapter 创建 `RealtimeClient`
- [x] 登录后建立 socket 连接
- [x] 验证 `ping -> pong` 请求配对（由 RealtimeClient 自动处理）
- [x] 注册 `newUpdateMessage`、`newConversation` 等服务端推送监听
- [x] 登出时销毁连接并清理挂起请求

### 阶段 3：IndexedDB 缓存 ✅
- [x] 定义 Store 对象仓库
- [x] 定义 Conversation 对象仓库
- [x] 定义 Message 对象仓库
- [x] 定义 UploadTask 对象仓库
- [x] 实现按主键 upsert
- [x] 实现服务端优先、本地回退读取策略

### 阶段 4：业务 service 补齐 ⚠️
- [x] 核对认证 service 是否满足 Web 登录、注册、资料编辑
- [x] 核对上传 service 是否满足 File API 分片上传
- [x] 补齐会话 service：会话列表、本地会话、创建会话、已读
- [x] 补齐消息 service：发送、重发、历史、推送订阅
- [ ] 补齐群聊 service：创建群、详情、更新、邀请、退出、解散（待后续群聊模块实现）

## 风险点和注意事项

1. **Token 安全**: token 存储在 IndexedDB 中，有 XSS 风险，需要配合 CSP 策略
2. **连接状态**: ConnectionObserver 目前只打印日志，后续需要连接 UI 状态显示
3. **多标签同步**: 一期不处理多标签同步，可能导致多标签登录同一账号时的连接竞争
4. **群聊 service**: 群聊相关的业务 service 需要在群聊模块（05_GROUP_CHAT.md）时补充

## 后续工作

1. 继续执行 `03_CONVERSATION_LIST.md`（会话列表）任务
2. 继续执行 `04_MESSAGING.md`（消息收发）任务
3. 在 `05_GROUP_CHAT.md` 时补充群聊相关的 service
4. 在 `06_MEDIA_UPLOAD.md` 时完善上传任务的使用

## 总结

本次任务成功完成了 Web 端网络与缓存底座的重构，统一使用 `shared-api` 的能力，建立了完整的 IndexedDB 缓存体系，为后续的会话列表、消息收发、群聊、媒体上传等功能打下了坚实的基础。

所有代码通过了类型检查和 lint 检查，符合项目规范。
