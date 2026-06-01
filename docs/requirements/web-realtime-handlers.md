# Web Realtime Handlers

## 背景

Web 端只注册了少量实时事件 handler，部分 socket 请求响应事件没有对应 listener，导致 `genericRequest` 收到响应后无法进入解码和 resolve 流程。

## 当前基础

- `RealtimeClient` 通过 `subscribeToEvent` 注册事件 listener。
- `genericRequest` 依赖响应事件 listener 触发 dispatch 解码和 request resolve。
- Electron 端集中注册了除 `pong` 外的所有 `ServiceToClientEvent`。
- Web 端原先只在 message/conversation service 中注册了 `ackSendMessage`、`newUpdateMessage`、`newConversation`。

## 目标

- Web 端对齐 Electron 端，注册所有服务端事件。
- 对业务推送事件保留实际处理逻辑。
- 对请求响应事件注册空 handler，保证 `genericRequest` 可以 resolve。

## 产品需求

- Web 端获取用户列表、群详情、群操作、历史消息等 socket 请求不应因缺少 handler 超时。
- 新消息、新会话、上传完成、错误事件继续更新本地 DB 和 zustand store。
- 重复调用初始化时不重复叠加相同 handler。

## Web 适配要点

- 新增 `apps/web/lib/services/realtime-listeners.service.ts` 集中注册实时事件。
- `initializeRealtimeListeners()` 只调用集中注册器。
- 复用 `messageService.toLocalMessage` 和 `conversationService.toLocalConversation` 保持数据映射一致。

## 任务编排

- 增加 Web 端全量 `ServiceToClientEvent` 注册。
- 迁移已有 message/conversation 事件处理到集中注册器。
- 保留无业务处理响应事件的空 handler。
- 执行 web lint/typecheck 和根检查，记录既有失败项。

## 风险点

- 根目录检查当前仍受既有 `shared-utils` lint 与 `electron_client` typecheck 问题影响。
- 上传完成事件只能更新已有 upload task 和 pending message；若页面刷新后 File 对象丢失，仍依赖既有上传恢复策略。
