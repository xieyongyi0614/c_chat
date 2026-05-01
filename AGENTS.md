# c_chat 项目说明

## 项目定位

`c_chat`（Corner Chat）是一款跨平台即时通讯桌面应用的**前端仓库**。采用 **Turborepo Monorepo** 架构，通过 pnpm workspace 统一管理 Electron 桌面客户端、React 渲染进程及各共享包。

- 仓库地址：`https://github.com/xieyongyi0614/c_chat`
- 后端仓库：`c_chat_service`（独立的 NestJS 服务端）
- 运行时：Node.js >= 18，pnpm 9.0.0
- 许可证：MIT（LICENSE 文件）

---

## 目录结构

```
c_chat/
├── apps/
│   ├── electron_client/   # Electron 桌面客户端工程
│   └── frontend/          # React 前端应用（渲染进程）
├── packages/
│   ├── chat_ui/           # UI 组件库（基于 shadcn/ui + Radix）
│   ├── shared-config/     # 共享配置常量（端口、IPC 通道名、错误码等）
│   ├── shared-protobuf/   # Protobuf 消息定义与生成代码
│   ├── shared-types/      # 共享 TypeScript 类型定义
│   └── shared-utils/      # 共享工具函数（IPC 客户端、时间格式化、缓存等）
├── docs/                  # 文档与截图
├── turbo.json             # Turbo 任务编排配置
├── pnpm-workspace.yaml    # pnpm 工作区配置
├── package.json           # 根 package.json（脚本入口）
└── tsconfig.json          # 根 TypeScript 配置
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron | 主进程 + 渲染进程架构 |
| 前端框架 | React 19 + Vite 7 | 渲染层 UI |
| 样式 | Tailwind CSS 4 | 原子化 CSS |
| 状态管理 | Zustand 5 | 轻量级状态管理 |
| 路由 | react-router-dom 7 | Hash 路由（适配 Electron） |
| 表单 | react-hook-form + zod | 表单校验 |
| 本地数据库 | better-sqlite3 | 消息/会话本地缓存 |
| 实时通信 | socket.io-client | WebSocket 客户端（Protobuf 编码） |
| HTTP 客户端 | Axios | REST API 调用 |
| 日志 | winston | 客户端日志 |
| Monorepo | Turborepo 2.x | 任务调度与构建 |
| 包管理 | pnpm 9.0.0 | workspace 依赖管理 |
| 代码规范 | ESLint + Prettier + Husky + commitlint | 统一的代码质量与提交规范 |

---

## 架构概览

### 进程模型

```
┌─────────────────────────────────────────────┐
│              Electron 主进程                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ 窗口管理  │ │ 托盘管理  │ │ IPC 处理层   │  │
│  │ (最多10个) │ │          │ │ (auth/chat/  │  │
│  │          │ │          │ │  upload)     │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ SQLite   │ │ Socket   │ │ HTTP(Axios) │  │
│  │ (本地DB)  │ │ (实时通信) │ │ (REST API)  │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
├─────────────────────────────────────────────┤
│            IPC (contextBridge)               │
├─────────────────────────────────────────────┤
│         Electron 渲染进程 (React)             │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ 路由/页面 │ │ Zustand  │ │  UI 组件库   │  │
│  │          │ │  状态管理 │ │ (chat_ui)    │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
└─────────────────────────────────────────────┘
```

### 通信路径

1. **渲染进程 ↔ 主进程**：通过 `contextBridge` 暴露的 `window.c_chat.ipcCall()` 方法，使用 typed Proxy（`shared-utils` 中的 `ipc` 对象）进行类型安全的 IPC 调用。
2. **主进程 ↔ 后端**：HTTP 请求走 Axios（`httpClient`），实时消息走 socket.io-client（Protobuf 二进制编码）。
3. **本地缓存**：消息和会话数据存入 SQLite（`global.db`），优先从服务端获取，网络不可用时回退到本地缓存。

### Protobuf 协议

前后端之间所有 WebSocket 消息均使用 Protobuf 编码。`Command` 消息作为通用信封：

```
Command { event, userId, client, requestId, payload[] }
```

事件映射关系定义在 `shared-protobuf/src/protoMap.ts` 中，包含客户端请求事件、服务端响应事件、以及客户端与服务端的编解码映射。

---

## apps/electron_client — Electron 桌面客户端

### 职责

- Electron 主进程：窗口生命周期管理、系统托盘、IPC 请求处理
- 本地 SQLite 数据库管理（消息表、会话表、键值存储表）
- Socket.IO 客户端管理（每个窗口独立连接，JWT 认证）
- HTTP API 调用（登录、注册等）
- 文件系统操作（文件选择、读取、分片上传）

### 核心模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 入口 | `src/main/index.ts` | 初始化 ApiClient、数据库、窗口管理器、托盘管理器 |
| 窗口管理 | `src/main/windows/windowManager.ts` | 单例，管理最多 10 个独立窗口，支持无边框窗口 |
| 托盘管理 | `src/main/tray/` | 系统托盘图标，可快速切换不同账号窗口 |
| 预加载脚本 | `src/preload/index.ts` | contextBridge 暴露 `window.c_chat` API |
| IPC 处理 | `src/ipc/api/auth.ts` | 登录、注册、自动登录 |
| IPC 处理 | `src/ipc/api/chat.ts` | 会话列表、消息历史、发送消息、已读 |
| IPC 处理 | `src/ipc/api/upload.ts` | 文件选择、读取、分片上传 |
| 数据库 | `src/db/DatabaseManager.ts` | SQLite 数据库管理，表注册与迁移 |
| 数据库 | `src/db/table/MessageTable.ts` | 消息表 CRUD（UPSERT，去重索引） |
| 数据库 | `src/db/table/ConversationTable.ts` | 会话表 CRUD |
| 数据库 | `src/db/table/StoreTable.ts` | 键值存储（token、用户信息等） |
| Socket | `src/utils/socket-io-client/` | 每窗口独立的 socket.io 连接，Protobuf 消息编解码 |
| HTTP | `src/utils/axios/` | Axios 实例，自动注入 token，统一错误处理 |

### 关键脚本

- `pnpm run dev`（在根目录）：启动 electron-vite 开发模式
- `pnpm run package`（在根目录）：打包为桌面安装包（Windows NSIS / macOS DMG / Linux AppImage）

---

## apps/frontend — React 前端应用

### 职责

- 聊天 UI 界面（会话列表、消息展示、新会话创建）
- 登录/注册表单
- 路由管理与认证守卫
- Zustand 状态管理（用户信息、会话列表、消息数据）

### 核心模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 入口 | `src/main.tsx` | React 渲染入口 |
| 根组件 | `src/App.tsx` | 包含标题栏、路由、全局加载遮罩、Toast |
| 路由 | `src/router/index.tsx` | Hash 路由，`/auth/*` 认证页，`/chat` 聊天页 |
| 认证守卫 | `src/router/CheckAuth.tsx` | 检查登录状态，自动跳转 |
| 用户状态 | `src/store/userStore.ts` | 用户信息、登录状态 |
| 会话状态 | `src/store/chatStore.ts` | 会话列表、当前选中会话 |
| 消息状态 | `src/store/messageStore.ts` | 按日期分组的消息列表 |
| 全局订阅 | `src/hooks/useGolablSubscribe.ts` | 监听主进程事件（新消息、Toast） |
| 聊天页 | `src/pages/chats/index.tsx` | 主聊天界面（会话列表 + 消息面板） |
| 数据加载 | `src/pages/chats/hooks/useChatsData.ts` | 会话列表与消息历史的获取（在线优先 + 本地回退） |

---

## packages/chat_ui — UI 组件库（@c_chat/ui）

### 职责

基于 **shadcn/ui + Radix UI** 的可复用组件库，提供统一的设计系统。

### 组件清单

`Alert`、`AlertDialog`、`Avatar`、`Badge`、`Button`、`Card`、`Command`（命令面板）、`Dialog`、`Form`（react-hook-form 集成）、`Input`、`Textarea`、`PasswordInput`、`Label`、`Select`、`ScrollArea`、`Separator`、`Spinner`、`Item`（列表项）、`Layout/Main`（布局容器）、`BackDropLoading`（全屏加载遮罩）。

### 导出配置

- 主入口：JS 组件 `./dist/index.es.js`
- 样式入口：`./src/styles/index.css`（Tailwind + 主题 CSS 变量）

---

## packages/shared-config — 共享配置（@c_chat/shared-config）

### 职责

全仓库统一的配置常量，被所有其他包依赖。

### 配置项

| 类别 | 文件 | 内容 |
|------|------|------|
| 主配置 | `src/index.ts` | `ELECTRON_RENDERER_PORT`(3000)，`IPC_CONFIG`(通道名) |
| 常量 | `src/lib/constants.ts` | 默认分页参数、默认列表数据结构 |
| 错误码 | `src/lib/errorCode.ts` | Socket 错误码（1011/2001/10001） |
| 文件类型 | `src/lib/fileType.ts` | 文件类型分类与扩展名映射、MIME 类型映射 |
| 命令行参数 | `src/lib/injected.ts` | `WEB_CONTENT_ID`，`WINDOW_ID` |
| 事件通道 | `src/lib/webContentEvent.config.ts` | Electron→客户端的事件通道名 |
| 数据库常量 | `src/lib/db/` | 全局窗口 ID、Store 表键名、表名常量 |

---

## packages/shared-protobuf — Protobuf 定义（@c_chat/shared-protobuf）

### 职责

维护前后端通信的 Protobuf 消息定义与自动生成的编解码代码。

### Proto 定义文件

| 文件 | 内容 |
|------|------|
| `static/Command.proto` | 通用消息信封 |
| `static/Common.proto` | 分页请求/响应 |
| `static/User.proto` | 用户信息、用户列表 |
| `static/Chat.proto` | 会话、消息、发送/已读等业务消息 |
| `static/ErrorResult.proto` | 错误消息格式 |

### protoMap.ts 关键映射

- **ClientToServiceEvent**：`ping`, `getUserInfo`, `getUserList`, `sendMessage`, `getConversationList`, `getMessageHistory`, `readMessage` 等
- **ServiceToClientEvent**：`pong`, `getUserInfoResponse`, `newMessage`, `ackSendMessage`, `getConversationListResponse` 等
- **ClientPaddingRequestsEvent**：客户端请求→期望响应的事件配对

---

## packages/shared-types — 共享类型（@c_chat/shared-types）

### 职责

纯类型定义包（无运行时依赖），定义 IPC 方法签名、数据库行类型、Socket 事件类型。

### 类型分类

| 类别 | 文件 | 内容 |
|------|------|------|
| IPC 基础 | `lib/ipc/ipcTypes.ts` | `IpcMethod<P,R>`、`IpcMessage`、`IpcResponse`、`IpcBridgeApi` |
| 认证类型 | `lib/ipc/apiTypes/authTypes.ts` | `SignIn`、`SignUp`、`GetUserInfo` 等方法的参数与返回值 |
| 聊天类型 | `lib/ipc/apiTypes/chatTypes.ts` | `SendMessage`、`GetConversationList` 等方法签名 |
| 文件类型 | `lib/ipc/apiTypes/fileOperationTypes.ts` | `SelectFiles`、`UploadFileByChunks` 等方法签名 |
| 数据库类型 | `lib/db/` | `ConversationTypeEnum`、`MessageTypeEnum`、`MessageStatusEnum` 及本地表行类型 |
| Socket 类型 | `lib/socket.types.ts` | 分页请求/响应、WebSocket 事件回调类型 |
| 全局声明 | `src/global.ts` | `window.c_chat` 的类型增强 |

---

## packages/shared-utils — 共享工具（@c_chat/shared-utils）

### 职责

跨项目共享的工具函数库。

### 工具分类

| 类别 | 文件 | 说明 |
|------|------|------|
| IPC 客户端 | `lib/ipc/ipcRenderer.ts` | 基于 Proxy 的类型安全 IPC 调用封装 |
| IPC 实例 | `lib/ipc/ipcClient.ts` | 单例 `ipc` 对象，前端通过它调用主进程方法 |
| 通用工具 | `lib/common.ts` | 分页参数转换 |
| 时间格式化 | `lib/formatTime.ts` | IM 场景时间显示（相对时间、聊天时间、日期分组） |
| 文件操作 | `lib/fileOperation.ts` | 文件类型判断、MIME 映射、Buffer 转 File/URL |
| 缓存 | `lib/cache/browserCache.ts` | Token 存储、登录状态判断 |
| JSON | `lib/json.ts` | 安全的 JSON 序列化/反序列化 |

---

## 包依赖关系图

```
@c_chat/electron_client
  ├── @c_chat/shared-config
  ├── @c_chat/shared-protobuf
  ├── @c_chat/shared-types
  └── @c_chat/shared-utils
        ├── @c_chat/shared-config
        ├── @c_chat/shared-protobuf
        └── @c_chat/shared-types

@c_chat/frontend
  ├── @c_chat/ui
  └── @c_chat/shared-utils
        └── (同上)

@c_chat/shared-protobuf
  └── @c_chat/shared-config
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有依赖 |
| `pnpm run dev` | 启动所有工作区开发任务 |
| `pnpm run build` | 编译所有项目 |
| `pnpm run lint` | 执行 lint 检查 |
| `pnpm run format` | 格式化代码 |
| `pnpm run package` | 打包桌面客户端 |
| `pnpm run check-types` | 类型检查 |

---

## 功能完成度

### 已完成
- 实时消息传递（WebSocket + Protobuf）
- 多窗口登录（最多 10 个窗口，不同账号）
- 系统托盘管理（快速切换窗口）
- 本地 SQLite 消息缓存（离线可用）
- 登录/注册（JWT 认证）

### 待开发
- 群聊功能
- 消息撤回、转发、搜索
- 文件传输、云端存储
- 语音/视频通话
- 好友系统、联系人管理
- 主题切换（深色/浅色）
- 多语言国际化
- 消息加密、阅后即焚

---

## 开发注意事项

1. **pnpm 版本**：必须使用 pnpm 9.0.0（与 `packageManager` 字段一致）
2. **SQLite 本地依赖**：`electron_client` 包含 `better-sqlite3` 原生模块，安装后需执行 `electron-builder install-app-deps`
3. **跨包引用**：使用 `workspace:*` 协议，必须在根目录执行 `pnpm install`
4. **Protobuf 同步**：修改 `.proto` 文件后需重新生成代码，前后端两端均需更新
5. **多窗口架构**：每个窗口有独立的 `windowId` 和 socket 连接，窗口间互不干扰
6. **本地数据库路径**：`userData/database/global.db`，包含 Store、Message、Conversation 三张表
