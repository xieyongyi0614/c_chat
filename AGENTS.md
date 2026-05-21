# c_chat - AI Context

## 项目定位

Monorepo 桌面 IM 项目，包含 Electron 客户端、React 前端和 NestJS 服务端。

## 重点约束

- IPC、Socket、API 相关改动尽量保持类型安全
- WebSocket 协议走 `shared-protobuf`
- 不要跨层直接调用，按 `React -> IPC -> 主进程 -> 服务端` 的链路处理
- 优先保持本地缓存和服务端同步逻辑一致

## 主要目录

- `apps/electron_client`：主进程、IPC、本地存储、Socket、上传
- `apps/frontend`：页面、状态管理、路由
- `apps/service`：后端接口、鉴权、上传、数据库相关
- `packages/shared-types`：共享类型
- `packages/shared-protobuf`：WS 协议
- `packages/shared-utils`：公共工具
- `packages/chat_ui`：通用 UI

## 当前重点

- 文件上传
- IM 消息流
- 本地数据库同步

## 修改原则

- 尽量贴合现有代码风格和目录结构
- 少做无关重构，优先完成当前需求
- 改动后关注类型检查和关键流程是否被影响
