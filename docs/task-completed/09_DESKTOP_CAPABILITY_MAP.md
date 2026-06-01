# 桌面能力 Web 取舍需求分析与任务编排

## 背景

Web 端不是 Electron 的换壳版本。它需要复刻 IM 主流程，但必须尊重浏览器运行时边界：没有主进程、没有系统托盘、没有 SQLite、没有本地路径、没有独立 Electron 窗口。本文档集中说明桌面专有能力在 Web 端的复刻、等价替代和放弃范围，避免各模块重复解释。

## 当前基础

### 可复用能力

- 网络请求和实时通信：复用 `packages/shared-api`。
- WebSocket 协议：复用 `packages/shared-protobuf`。
- 类型和契约：复用 `packages/shared-types`。
- 录音和波形：复用或扩展 `packages/audio-core`。
- UI 基础组件：复用 `packages/chat_ui` 的 shadcn 组件。

### 需要取舍的桌面能力

| 桌面能力                | Web 方案                               | 一期结论   |
| ----------------------- | -------------------------------------- | ---------- |
| IPC + 主进程网络层      | `shared-api` Web adapter               | 等价替代   |
| Protobuf over Socket.IO | `shared-protobuf` 原样复用             | 复刻       |
| SQLite 本地缓存         | IndexedDB                              | 等价替代   |
| 独立媒体预览窗口        | 应用内 Lightbox / 路由弹层             | 等价替代   |
| 多窗口多账号            | 单标签单账号                           | 一期不复刻 |
| 系统托盘                | 浏览器无等价                           | 不复刻     |
| 自定义标题栏 / 窗口控制 | 浏览器原生窗口                         | 不复刻     |
| 本地文件路径读取        | File API / Blob / object URL           | 等价替代   |
| Electron 音频采集       | `audio-core` + MediaRecorder/Web Audio | 等价替代   |

## 目标

### 一期目标

- 明确 Web 端可以复刻的能力：认证、会话、消息、群聊、媒体上传、媒体预览、语音消息。
- 明确 Web 端需要替代的能力：主进程网络层、SQLite、本地路径、独立预览窗口、Electron 音频。
- 明确 Web 端不复刻的能力：托盘、自定义窗口控制、多窗口多账号。
- 为各模块提供统一取舍依据。

### 二期方向

- PWA 推送、Service Worker、浏览器通知可作为托盘和后台消息的二期替代。
- 多账号可通过账号级 IndexedDB 命名空间与多连接实例设计另起文档。
- 会话媒体浏览器、全局媒体库、文件系统访问 API 可作为媒体增强方向。

## 产品需求

### 主进程网络层替代

桌面端通过 IPC 进入主进程网络层。Web 端应通过 `shared-api` Web adapter 直接完成请求。

验收标准：

- Web 端不使用 `window.c_chat.ipcCall`。
- Web 端不新增平行 HTTP/WebSocket client。
- HTTP 走 `HttpClient`。
- WebSocket 走 `RealtimeClient`。
- 业务 service 放在 `shared-api`，页面不拼协议。

### Protobuf 协议复用

实时协议不因 Web 端而变化。

验收标准：

- Web 端复用 `Chat.proto`、`protoMap`、Command 信封。
- 新增事件先更新 `shared-protobuf`。
- 服务端无需为 Web 端增加另一套 WebSocket 协议。

### SQLite 替代

Web 端使用 IndexedDB 替代 SQLite。

验收标准：

- Store、Conversation、Message、UploadTask 都有 IndexedDB 对象仓库。
- 字段对齐 `shared-types`。
- 支持本地回退和 upsert。
- 不把 IndexedDB 结构写成 Web 私有业务契约。

### 独立预览窗口替代

Web 端使用应用内 Lightbox 或路由弹层替代独立 Electron 窗口。

验收标准：

- 点击图片/视频在当前 Web 应用内预览。
- 不使用 `window.open` 作为主方案。
- 不复刻 Electron 窗口复用、置顶、窗口尺寸记忆等系统窗口语义。
- 预览交互与桌面端核心能力保持一致。

### 本地路径替代

Web 端只处理 File、Blob、远端 URL 和 object URL。

验收标准：

- Web 上传不依赖 `filePath`。
- Web 预览不调用 `ReadLocalFile`。
- 发送中媒体用 File/Blob object URL。
- 关闭或切换媒体时释放 object URL。
- 下载使用浏览器下载能力，不调用 `OpenLocalFile`。

### 音频能力替代

Web 端通过 `audio-core` 统一音频基础能力，并使用浏览器 API 补运行时能力。

验收标准：

- 录音使用 `audio-core` 对外能力或在 `audio-core` 内扩展浏览器实现。
- 音频采集使用 MediaRecorder。
- 波形生成使用 `audio-core` 的波形算法或在其内扩展 Web Audio 实现。
- 播放状态复用统一播放器管理，不在消息组件里散落 Audio 实例。

### 不复刻能力

托盘、自定义窗口控制、多窗口多账号不进入一期。

验收标准：

- 需求文档不为一期安排托盘任务。
- 需求文档不安排自定义浏览器标题栏或窗口按钮。
- 需求文档不安排多账号同时登录。
- 相关 UI 不出现无法实现的承诺。

## 任务编排

### 阶段 0：能力分类确认

目标：统一复刻、替代、不复刻边界。

- [x] 确认 `shared-api` 替代 IPC + 主进程网络层。
- [x] 确认 `shared-protobuf` 原样复用。
- [x] 确认 IndexedDB 替代 SQLite。
- [x] 确认 Lightbox 替代独立预览窗口。
- [x] 确认 File API 替代本地路径。
- [x] 确认 `audio-core` + 浏览器 API 替代 Electron 音频。
- [x] 确认托盘、自定义窗口控制、多窗口多账号不进入一期。

产出：

- 所有模块使用同一取舍表。

### 阶段 1：模块引用落地

目标：各模块文档引用取舍结论，不重复发散。

- [x] 认证模块引用单账号取舍。
- [x] 传输模块引用 `shared-api` 和 IndexedDB 取舍。
- [x] 会话与消息模块引用 IndexedDB 取舍。
- [x] 上传与预览模块引用 File API 取舍。
- [x] 语音模块引用 `audio-core` 和浏览器音频取舍。
- [x] 群聊模块引用共享会话和消息底座。

产出：

- 各模块文档不会重复写一套桌面能力分析。

### 阶段 2：一期范围核对

目标：避免把不复刻能力混入一期任务。

- [x] 检查是否存在托盘任务。
- [x] 检查是否存在自定义窗口控制任务。
- [x] 检查是否存在多窗口多账号任务。
- [x] 检查是否存在 Web 专用协议或网络 client 任务。
- [x] 检查是否存在手写 shadcn 基础交互任务。

产出：

- 一期范围清晰，不隐藏额外复杂度。

## 风险点

- 取舍不明确会导致 Web 端为了“完全复刻”去实现浏览器不适合做的能力。
- 如果不集中声明 `shared-api` 边界，各功能模块容易各写一套请求逻辑。
- IndexedDB 与 SQLite 的差异会影响首屏、离线和并发写入，需要在底座层统一封装。
- 文件路径、窗口和托盘属于 Electron 运行时能力，Web 端强行模拟会带来体验和安全问题。
- 音频兼容性取决于浏览器，录音格式需要在语音模块里单独验收。
