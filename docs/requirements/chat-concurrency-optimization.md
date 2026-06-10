# 聊天收发并发优化

## 背景

服务端聊天链路目前集中在单个 NestJS Socket Gateway 内，连接索引使用进程内 `userSockets`，消息收发路径存在高频日志、逐连接定向推送和逐会话 `join` 等开销。并发连接数或多实例部署上来后，单进程内存索引无法跨实例工作。

## 当前基础

- WebSocket 协议已经走 `shared-protobuf`，本次不新增协议字段。
- 服务端已有 Redis 配置和 Bull 队列，适合复用 Redis 做 Socket.io adapter。
- 消息写入仍通过 `Conversation.lastSeq` 分配单会话序号，先保持该一致性模型。

## 目标

- 降低聊天收发热路径日志和本地连接表依赖。
- 支持通过 Socket.io Redis adapter 做多实例房间广播。
- 保持客户端 protobuf 事件、ack 语义和业务响应结构不变。

## 产品需求

- 用户连接成功后加入稳定用户房间 `user:${userId}` 和全部会话房间。
- 定向用户推送走用户房间，不再依赖当前进程是否持有目标 socket id。
- 默认本地开发不启用 Redis adapter；部署时通过 `SOCKET_IO_REDIS_ADAPTER_ENABLED=true` 开启。

## Web 适配要点

- 前端和 Electron 不需要改 protobuf 协议。
- 客户端实时消息注册逻辑保持不变，只移除高频发送、接收、响应日志。

## 任务编排

- 后端 Gateway：连接批量 join、定向推送切换到 user room。
- 后端启动：新增可选 Redis Socket.io adapter。
- 数据库：为会话列表分页增加 `ConversationParticipant(userId,isDeleted,isTop,updateTime)` 复合索引。
- 验证：补充 Gateway/Registry 单元测试，执行 service typecheck/lint 和根 lint/typecheck。

## 风险点

- Redis adapter 开启后需要确保部署 Redis 可达。
- Prisma schema 已增加索引，实际数据库需执行迁移或同步流程。
- 会话 unread 动态计算仍是后续优化点，本次不改数据语义。
