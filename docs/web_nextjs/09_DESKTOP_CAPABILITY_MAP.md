# 桌面能力 Web 取舍映射说明

## 目的

集中说明桌面专有能力在 Web 端的取舍，供各模块文档引用，避免重复。本文档是 Web 端复刻规划的能力映射专项说明，与 `00_OVERVIEW.md` 中的映射总表保持完全一致，并对每项能力提供详细的实现位置、等价方案、结论、理由、影响面和一期取舍。

## 能力总表

下表与 `00_OVERVIEW.md` 完全一致，是全文最重要的映射依据。

| 桌面端能力                    | 实现位置                                                                                | Web 等价方案                                                                                     | 结论       |
| ----------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| React → IPC → 主进程 → NestJS | `preload/index.ts`、`ipc/api/*`、`shared-utils` 的 `ipc` Proxy                          | 浏览器侧 browser service 模块直接持有 `socket.io-client` + `Axios`，替换 `window.c_chat.ipcCall` | 等价替代   |
| Protobuf over Socket.IO       | `utils/socket-io-client/`、`shared-protobuf/protoMap.ts`                                | 浏览器端复用同一套 `shared-protobuf`，几乎零改动                                                 | 复刻       |
| 本地 SQLite 缓存              | `db/DatabaseManager.ts`、`db/table/*`(Message/Conversation/Store/UploadTask)            | IndexedDB(Dexie 或原生)，保留「离线优先 → 服务端回退」                                           | 等价替代   |
| 独立媒体预览窗口              | `main/windows/mediaPreviewWindow.ts`、`apps/media_preview`                              | 应用内 Lightbox / 路由弹层，无独立窗口                                                           | 等价替代   |
| 多窗口多账号(最多 10 窗)      | `main/windows/windowManager.ts`                                                         | 单标签单账号；多账号靠多浏览器标签；一期只做单账号                                               | 一期不复刻 |
| 系统托盘                      | `main/tray/trayManager.ts`                                                              | 浏览器无等价                                                                                     | 不复刻     |
| 自定义标题栏 / 窗口控制       | `components/system/TitleBar.tsx`、`CloseAppBtn.tsx`                                     | 浏览器原生窗口                                                                                   | 不复刻     |
| 文件选择 / 读取本地路径       | `ipc/api/fileOperationIpc.ts`(`SelectFiles`/`ReadLocalFile`/`SaveFile`/`OpenLocalFile`) | File API / `<input type=file>` / 下载；无本地路径，改用 File/Blob/object URL                     | 等价替代   |
| 语音录制(Electron 音频)       | `services/audioService.ts`、`ipc/api/audioIpc.ts`、`packages/audio-core`                | MediaRecorder + Web Audio API，波形浏览器侧生成                                                  | 等价替代   |

## 逐项说明

### React → IPC → 主进程 → NestJS

**桌面端实现**

桌面端采用四段链路：`React(渲染进程) → contextBridge(window.c_chat.ipcCall) → 主进程(IPC handler) → Axios/Socket.IO+Protobuf → NestJS`。

核心文件：

- `apps/electron_client/src/preload/index.ts`：通过 `contextBridge.exposeInMainWorld` 暴露 `window.c_chat.ipcCall`。
- `apps/electron_client/src/ipc/api/*`：主进程 IPC handler，包含 `authIpc.ts`、`chatIpc.ts`、`fileOperationIpc.ts`、`audioIpc.ts` 等。
- `packages/shared-utils/src/ipc/ipcClient.ts`、`ipcRenderer.ts`：封装 `ipcCall` Proxy，提供类型安全的跨进程调用。

**Web 等价方案**

Web 端压缩为两段链路：`React(Next.js) → browser service 模块(直接持有 socket.io-client + Axios + Protobuf 编解码) → NestJS`。

原本运行在主进程里的 Axios、Socket.IO 客户端与 Protobuf 编解码全部下放到浏览器侧的 browser service 模块。`window.c_chat.ipcCall` 这一跨进程桥被同名同签名的浏览器侧方法调用替换，对页面组件而言调用方式保持一致，因此上层 React 业务可以最大限度复用。

**结论**

等价替代。

**理由**

浏览器侧可以直接持有 `socket.io-client` 与 `Axios`，无需跨进程通信。Web 端的 browser service 模块承担桌面端主进程的网络职责，上层 React 组件调用方式保持一致，业务逻辑可以最大限度复用。

**影响面**

- `shared-utils` 的 `ipc` Proxy 需要在 Web 端替换为对应的 browser service 封装。
- 所有模块的网络调用都依赖此能力，是 Web 端的底座。

**一期取舍**

一期必须完整实现 browser service 模块，替换 `window.c_chat.ipcCall`，保证上层 React 组件调用方式一致。

### Protobuf over Socket.IO

**桌面端实现**

桌面端通过 Socket.IO 传输 Protobuf 二进制消息，实现实时推送与请求响应。

核心文件：

- `apps/electron_client/src/utils/socket-io-client/`：Socket.IO 客户端封装，包含连接管理、心跳、重连、事件监听。
- `packages/shared-protobuf/src/protoMap.ts`：客户端事件与服务端响应事件的映射表，定义所有 Protobuf 消息类型。
- `packages/shared-protobuf/src/static/Chat.proto`：Protobuf 协议定义。

**Web 等价方案**

浏览器端复用同一套 `shared-protobuf`，几乎零改动。Protobuf 编解码本身与运行时无关，Web 端直接引入即可。Socket.IO 客户端从主进程下放到浏览器侧的 browser service 模块，连接管理、心跳、重连、事件监听逻辑保持一致。

**结论**

复刻。

**理由**

Protobuf 协议与运行时无关，`shared-protobuf` 包可以直接在浏览器侧使用。Socket.IO 官方提供浏览器端 `socket.io-client`，与 Electron 主进程使用的客户端功能一致。Web 端只需将 Socket.IO 客户端从主进程下放到浏览器侧，协议层无需改动。

**影响面**

- `02_TRANSPORT_DATA.md` 传输层底座模块的核心能力。
- 所有实时推送与请求响应都依赖此能力，包括消息收发、会话同步、群聊、语音消息等。

**一期取舍**

一期必须完整复刻 Protobuf over Socket.IO，保证实时推送与请求响应能力与桌面端一致。

### 本地 SQLite 缓存

**桌面端实现**

桌面端使用 SQLite 作为本地缓存，实现「离线优先 → 服务端回退」策略。

核心文件：

- `apps/electron_client/src/db/DatabaseManager.ts`：SQLite 数据库管理器，封装连接、事务、迁移。
- `apps/electron_client/src/db/table/*`：本地表定义，包含 `Message`、`Conversation`、`Store`(KV 存储)、`UploadTask`(上传任务)。

**Web 等价方案**

IndexedDB(Dexie 或原生)，保留「离线优先 → 服务端回退」策略。IndexedDB 是浏览器端的结构化存储方案，支持索引、事务、异步查询，功能上可以等价替代 SQLite。

**结论**

等价替代。

**理由**

IndexedDB 是浏览器端的标准结构化存储方案，支持索引、事务、异步查询，功能上可以等价替代 SQLite。Dexie 是 IndexedDB 的轻量封装，提供类似 ORM 的 API，可以降低迁移成本。「离线优先 → 服务端回退」策略在 Web 端同样适用，保证离线体验。

**影响面**

- `02_TRANSPORT_DATA.md` 传输层底座模块的核心能力。
- 所有模块的本地缓存都依赖此能力，包括会话列表、消息历史、上传任务、KV 存储等。
- `shared-types` 需要按需新增 IndexedDB 行类型，替代原 SQLite 表行类型。

**一期取舍**

一期必须完整实现 IndexedDB 缓存，保证离线体验与桌面端一致。需要注意 IndexedDB 的异步事务模型与 SQLite 的同步事务模型存在差异，需要在 browser service 模块中封装一致的 API。

### 独立媒体预览窗口

**桌面端实现**

桌面端通过 Electron 的 `BrowserWindow` 创建独立的媒体预览窗口，支持图片、视频预览。

核心文件：

- `apps/electron_client/src/main/windows/mediaPreviewWindow.ts`：媒体预览窗口管理器，封装窗口创建、销毁、通信。
- `apps/media_preview`：独立的媒体预览应用，运行在独立窗口中。

**Web 等价方案**

应用内 Lightbox / 路由弹层，无独立窗口。浏览器端通过 Modal / Dialog / 路由弹层实现媒体预览，预览组件运行在主应用内，无法创建独立窗口。

**结论**

等价替代。

**理由**

浏览器无法创建独立窗口(除非使用 `window.open`，但体验与 Electron 独立窗口差异较大)。应用内 Lightbox / 路由弹层是浏览器端的标准媒体预览方案，功能上可以等价替代独立窗口，且用户体验更符合 Web 应用习惯。

**影响面**

- `07_MEDIA_PREVIEW.md` 媒体预览模块的核心能力。
- 影响图片、视频消息的预览交互，从独立窗口改为应用内弹层。

**一期取舍**

一期必须实现应用内 Lightbox / 路由弹层，保证媒体预览功能可用。独立窗口的体验优势(如独立任务栏图标、独立窗口控制)在 Web 端无法复刻，但应用内预览的功能完整性与桌面端一致。

### 多窗口多账号(最多 10 窗)

**桌面端实现**

桌面端通过 Electron 的 `BrowserWindow` 支持多窗口多账号，最多同时打开 10 个窗口，每个窗口独立登录一个账号。

核心文件：

- `apps/electron_client/src/main/windows/windowManager.ts`：窗口管理器，封装窗口创建、销毁、账号隔离、窗口间通信。

**Web 等价方案**

单标签单账号；多账号靠多浏览器标签；一期只做单账号。浏览器端无法在单个标签内创建多个独立的应用实例，多账号需要依赖多浏览器标签，每个标签独立登录一个账号。但浏览器标签间的存储(localStorage / IndexedDB)默认共享，需要额外的账号隔离机制。

**结论**

一期不复刻。

**理由**

浏览器无多窗口账号隔离的等价方案。虽然可以通过多浏览器标签 + 存储隔离机制实现多账号，但复杂度高，且用户体验与桌面端差异较大。一期优先保证单账号体验完整，多账号作为二期需求。

**影响面**

- `01_AUTH_USER.md` 认证与用户模块的账号管理能力。
- 影响用户登录、登出、账号切换的交互流程。

**一期取舍**

一期只做单账号，不支持多账号同时登录。用户需要登出当前账号后才能登录其他账号。多账号能力作为二期需求，需要设计存储隔离机制(如 IndexedDB 数据库名加账号 ID 后缀)。

### 系统托盘

**桌面端实现**

桌面端通过 Electron 的 `Tray` API 实现系统托盘，支持托盘图标、托盘菜单、托盘通知。

核心文件：

- `apps/electron_client/src/main/tray/trayManager.ts`：托盘管理器，封装托盘创建、销毁、菜单更新、通知。

**Web 等价方案**

浏览器无等价。

**结论**

不复刻。

**理由**

浏览器无法访问系统托盘 API，无等价方案。Web 应用的后台运行依赖浏览器标签保持打开，无法像桌面应用一样最小化到托盘。

**影响面**

- 影响用户关闭窗口后的后台运行体验。
- 影响托盘通知、托盘菜单等桌面端特有交互。

**一期取舍**

一期不复刻系统托盘。用户关闭浏览器标签后，Web 应用停止运行，无法接收实时消息推送(除非使用 Service Worker + Push API，但需要用户授权且体验与桌面端差异较大)。

### 自定义标题栏 / 窗口控制

**桌面端实现**

桌面端通过 Electron 的 `frame: false` 配置隐藏原生标题栏，自定义实现标题栏与窗口控制按钮。

核心文件：

- `apps/frontend/src/components/system/TitleBar.tsx`：自定义标题栏组件，包含窗口标题、最小化、最大化、关闭按钮。
- `apps/frontend/src/components/system/CloseAppBtn.tsx`：关闭按钮组件，封装关闭窗口逻辑。

**Web 等价方案**

浏览器原生窗口。

**结论**

不复刻。

**理由**

浏览器无法隐藏原生标题栏或自定义窗口控制按钮，Web 应用只能使用浏览器原生窗口。自定义标题栏是桌面应用的视觉特色，但在 Web 端无法实现。

**影响面**

- 影响应用的视觉风格，从自定义标题栏改为浏览器原生标题栏。
- 影响窗口控制交互，从自定义按钮改为浏览器原生按钮。

**一期取舍**

一期不复刻自定义标题栏，使用浏览器原生窗口。桌面端的 `TitleBar.tsx` 与 `CloseAppBtn.tsx` 组件在 Web 端不使用。

### 文件选择 / 读取本地路径

**桌面端实现**

桌面端通过 Electron 的 `dialog` API 与 Node.js 的 `fs` 模块实现文件选择与本地路径读取。

核心文件：

- `apps/electron_client/src/ipc/api/fileOperationIpc.ts`：文件操作 IPC handler，包含 `SelectFiles`(选择文件)、`ReadLocalFile`(读取本地文件)、`SaveFile`(保存文件)、`OpenLocalFile`(打开本地文件)。

**Web 等价方案**

File API / `<input type=file>` / 下载；无本地路径，改用 File/Blob/object URL。浏览器端通过 `<input type=file>` 选择文件，通过 File API 读取文件内容，通过 `<a download>` 或 Blob URL 下载文件。浏览器无法访问本地文件系统路径，只能通过 File 对象或 Blob 对象操作文件内容。

**结论**

等价替代。

**理由**

浏览器的 File API 可以等价替代 Electron 的文件操作能力，但无法访问本地文件系统路径。Web 端的文件操作基于 File 对象或 Blob 对象，无法获取或操作本地路径。这对上传与预览功能有影响：上传时无法显示本地路径，只能显示文件名；预览时无法通过本地路径加载文件，只能通过 object URL 或 Blob URL。

**影响面**

- `01_AUTH_USER.md` 认证与用户模块的头像上传能力。
- `06_MEDIA_UPLOAD.md` 媒体上传模块的文件选择与上传能力。
- `07_MEDIA_PREVIEW.md` 媒体预览模块的本地文件预览能力。
- `04_MESSAGING.md` 消息收发模块的文件消息、图片消息能力。

**一期取舍**

一期必须实现 File API 替代方案，保证文件选择、上传、下载功能可用。需要注意：

- 上传时无法显示本地路径，只能显示文件名。
- 预览时无法通过本地路径加载文件，只能通过 object URL 或 Blob URL。
- 无法实现「打开本地文件」功能(如点击文件消息后在本地文件管理器中打开)。

### 语音录制(Electron 音频)

**桌面端实现**

桌面端通过 Electron 的音频能力与 `packages/audio-core` 实现语音录制、波形生成、播放。

核心文件：

- `apps/electron_client/src/services/audioService.ts`：音频服务，封装录音、播放、波形生成。
- `apps/electron_client/src/ipc/api/audioIpc.ts`：音频 IPC handler，封装跨进程音频调用。
- `packages/audio-core`：音频核心包，封装音频编解码、波形生成算法。

**Web 等价方案**

MediaRecorder + Web Audio API，波形浏览器侧生成。浏览器端通过 MediaRecorder API 录制音频，通过 Web Audio API 生成波形，通过 `<audio>` 元素播放音频。

**结论**

等价替代。

**理由**

浏览器的 MediaRecorder API 与 Web Audio API 可以等价替代 Electron 的音频能力。MediaRecorder 支持多种音频格式(如 webm、ogg、mp4)，Web Audio API 支持音频解码与波形生成。需要注意音频格式兼容性：桌面端与 Web 端的录音格式可能不同，需要在服务端或客户端做格式转换。

**影响面**

- `08_VOICE_MESSAGE.md` 语音消息模块的核心能力。
- 影响语音消息的录制、波形生成、播放交互。

**一期取舍**

一期必须实现 MediaRecorder + Web Audio API 替代方案，保证语音消息功能可用。需要注意：

- 音频格式兼容性：桌面端与 Web 端的录音格式可能不同，需要在服务端或客户端做格式转换。
- 浏览器兼容性：MediaRecorder API 在部分浏览器中支持有限，需要做兼容性检测与降级方案。
- 波形生成性能：Web Audio API 的波形生成在浏览器侧进行，需要注意性能优化。

## 对模块的影响索引

下表列出每项能力影响到的模块文档，供交叉引用。

| 能力                    | 影响模块                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| React → IPC → 主进程    | `02_TRANSPORT_DATA.md`(底座)、所有模块(网络调用)                                                   |
| Protobuf over Socket.IO | `02_TRANSPORT_DATA.md`(底座)、`04_MESSAGING.md`、`05_GROUP_CHAT.md`、`08_VOICE_MESSAGE.md`         |
| 本地 SQLite 缓存        | `02_TRANSPORT_DATA.md`(底座)、`03_CONVERSATION_LIST.md`、`04_MESSAGING.md`、`06_MEDIA_UPLOAD.md`   |
| 独立媒体预览窗口        | `07_MEDIA_PREVIEW.md`                                                                              |
| 多窗口多账号            | `01_AUTH_USER.md`                                                                                  |
| 系统托盘                | 无(不复刻)                                                                                         |
| 自定义标题栏 / 窗口控制 | 无(不复刻)                                                                                         |
| 文件选择 / 读取本地路径 | `01_AUTH_USER.md`(头像)、`04_MESSAGING.md`(文件/图片)、`06_MEDIA_UPLOAD.md`、`07_MEDIA_PREVIEW.md` |
| 语音录制(Electron 音频) | `08_VOICE_MESSAGE.md`                                                                              |
