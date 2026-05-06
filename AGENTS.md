# c_chat — AI Context

## 项目定位

Electron + React 的桌面 IM 应用（Monorepo），前端仓库，对接 NestJS 后端。

---

## 核心架构

### 进程模型

- **主进程（Electron）**
  - IPC 处理（auth/chat/upload）
  - SQLite 本地数据库
  - Socket.IO（实时通信）
  - HTTP（Axios）

- **渲染进程（React）**
  - UI（聊天界面）
  - Zustand 状态管理
  - 路由（react-router）

---

## 通信方式

| 类型     | 技术                  | 说明                           |
| -------- | --------------------- | ------------------------------ |
| IPC      | contextBridge + Proxy | 类型安全调用主进程             |
| 实时通信 | socket.io + Protobuf  | 所有 WS 消息统一封装为 Command |
| HTTP     | Axios                 | REST API                       |

---

## Monorepo 结构（关键）

```
apps/
  electron_client   # 主进程
  frontend          # React 渲染进程

packages/
  shared-types      # 类型定义（核心）
  shared-protobuf   # WS 协议
  shared-utils      # IPC / 工具
  shared-config     # 常量
  chat_ui           # UI 组件库
```

---

## 关键设计

### 1️⃣ 类型驱动

- IPC / Socket / API 全部强类型
- 使用 shared-types + protobuf

### 2️⃣ 本地优先

- SQLite 缓存消息
- 网络失败回退本地

### 3️⃣ 多窗口隔离

- 每窗口独立 socket / 状态

### 4️⃣ 分层通信

```
React → IPC → 主进程 → (HTTP / WS)
```

---

## 数据流（核心）

### 消息流

```
UI → IPC → Socket → 服务端 → Socket → 主进程 → UI
```

### 本地缓存

```
服务端 → 主进程 → SQLite → UI
```

---

## 当前重点模块

- 文件上传（分片 + 队列）
- IM 消息系统
- 本地数据库同步

---

## 重要约定

- IPC 必须类型安全（shared-types）
- WebSocket 必须走 Protobuf
- 不允许跨层直接调用（必须走 IPC）
- 数据优先从服务端，失败回退本地

---

## 常见入口

- 主进程入口：`electron_client/src/main`
- IPC：`electron_client/src/ipc`
- 前端：`frontend/src`
- 状态：Zustand stores
- 协议：`shared-protobuf`

---
