# Web 端复刻总览

本文件是 c_chat Web 端复刻规划的总览入口，记录 Web 端的项目定位、整体架构、桌面到 Web 的能力映射、模块索引、共享包改造点、开发顺序和非复刻范围。本批文档只做需求与任务编排规划，不涉及实现代码。

## Web 项目定位

Web 端用 Next.js 一比一复刻现有 Electron 桌面端 IM。浏览器侧通过 browser service 模块直接持有 `socket.io-client` 与 `Axios`，直连现有 NestJS 后端，不引入 BFF，Next.js 只负责页面与路由。Web 端复用 monorepo `packages/` 下的共享包，与 Electron 仓库共用同一套 `packages/`，保证协议、类型与常量单一来源。

## 整体架构

```txt
桌面端: React(渲染进程) → contextBridge(window.c_chat.ipcCall) → 主进程(IPC handler) → Axios/Socket.IO+Protobuf → NestJS
Web 端: React(Next.js) → browser service 模块(直接持有 socket.io-client + Axios + Protobuf 编解码) → NestJS
```

核心差异是 Web 端没有主进程这一层。桌面端的 `React → IPC → 主进程 → 网络` 四段链路，在 Web 端被压缩为 `React → browser service → 网络`：原本运行在主进程里的 Axios、Socket.IO 客户端与 Protobuf 编解码全部下放到浏览器侧的 browser service 模块。`window.c_chat.ipcCall` 这一跨进程桥被同名同签名的浏览器侧方法调用替换，对页面组件而言调用方式保持一致，因此上层 React 业务可以最大限度复用。

## 桌面 → Web 能力映射总表

下表是全文最重要的映射依据，09 文档会复用同一张表。

| 桌面端能力                    | 实现位置                                                                                | Web 等价方案                                                                 | 结论       |
| ----------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| React → IPC → 主进程 → NestJS | `preload/index.ts`、`ipc/api/*`、`shared-utils` 的 `ipc` Proxy                          | 浏览器侧 browser service 模块封装`socket`                                    | 等价替代   |
| Protobuf over Socket.IO       | `utils/socket-io-client/`、`shared-protobuf/protoMap.ts`                                | 浏览器端复用同一套 `shared-protobuf`，几乎零改动                             | 复刻       |
| 本地 SQLite 缓存              | `db/DatabaseManager.ts`、`db/table/*`(Message/Conversation/Store/UploadTask)            | IndexedDB(Dexie 或原生)，保留「离线优先 → 服务端回退」                       | 等价替代   |
| 独立媒体预览窗口              | `main/windows/mediaPreviewWindow.ts`、`apps/media_preview`                              | 应用内 Lightbox / 路由弹层，无独立窗口                                       | 等价替代   |
| 多窗口多账号(最多 10 窗)      | `main/windows/windowManager.ts`                                                         | 单标签单账号；多账号靠多浏览器标签；一期只做单账号                           | 一期不复刻 |
| 系统托盘                      | `main/tray/trayManager.ts`                                                              | 浏览器无等价                                                                 | 不复刻     |
| 自定义标题栏 / 窗口控制       | `components/system/TitleBar.tsx`、`CloseAppBtn.tsx`                                     | 浏览器原生窗口                                                               | 不复刻     |
| 文件选择 / 读取本地路径       | `ipc/api/fileOperationIpc.ts`(`SelectFiles`/`ReadLocalFile`/`SaveFile`/`OpenLocalFile`) | File API / `<input type=file>` / 下载；无本地路径，改用 File/Blob/object URL | 等价替代   |
| 语音录制(Electron 音频)       | `services/audioService.ts`、`ipc/api/audioIpc.ts`、`packages/audio-core`                | MediaRecorder + Web Audio API，波形浏览器侧生成                              | 等价替代   |

## 模块索引

- `[01 认证与用户](01_AUTH_USER.md)` — 登录/注册/自动登录/登出、资料编辑、用户列表
- `[02 传输与数据底座](02_TRANSPORT_DATA.md)` — Socket.IO+Protobuf 直连、Axios、IndexedDB 缓存(所有模块底座)
- `[03 会话列表](03_CONVERSATION_LIST.md)` — folder 筛选、置顶、未读、定时同步
- `[04 消息收发](04_MESSAGING.md)` — 文本/图片/文件/语音/视频、已读、重发、ack、日期分组
- `[05 群聊](05_GROUP_CHAT.md)` — 群聊全流程(对照已有 GROUP_CHAT_REQUIREMENTS，标注 Web 差异)
- `[06 媒体上传](06_MEDIA_UPLOAD.md)` — 分片上传链路 Web 适配、File API、IndexedDB 任务表
- `[07 媒体预览](07_MEDIA_PREVIEW.md)` — 独立预览窗口 → 应用内 Lightbox
- `[08 语音消息](08_VOICE_MESSAGE.md)` — MediaRecorder 录音、波形、播放
- `[09 桌面能力映射](09_DESKTOP_CAPABILITY_MAP.md)` — 桌面专有能力的 Web 取舍集中说明

## 共享包改造点

- `shared-protobuf`：浏览器端复用 `protoMap`，几乎零改。Protobuf 编解码本身与运行时无关，Web 端直接引入即可。
- `shared-types`：IPC 方法签名复用为 browser service 方法签名；按需新增 IndexedDB 行类型，替代原 SQLite 表行类型。
- `shared-config`：端口/通道名常量在 Web 端按需取舍，Electron 专有通道(窗口、托盘、文件路径)不适用，网络相关常量保留。
- `shared-utils`：`ipc` Proxy(`ipcClient.ts`/`ipcRenderer.ts`)在 Web 端替换为对应的 browser service 封装；`browserCache` 的 token 存储从 Electron 存储改为 localStorage / IndexedDB。

## 推荐开发顺序

`02 传输层底座 → 01 认证/用户 → 03 会话列表 → 04 消息 → 06 上传 → 08 语音/07 预览(可并行) → 05 群聊 → 09 收尾对照`。

02 是所有模块的底座(Socket.IO+Protobuf 直连、Axios、IndexedDB 缓存)，必须先行；06 上传链路先于 08 语音与 07 预览，因为语音消息要走上传链路提交、预览依赖媒体消息；08 与 07 互不依赖可并行；05 群聊复用前述全部能力，放在功能模块末尾；09 在功能落地后集中对照桌面专有能力的取舍收尾。

## 非复刻范围

- 好友/联系人：`apps/frontend/src/pages/contacts/ContactsPanel.tsx` 当前是 `mockContacts` 纯 mock UI，无 proto、无 IPC、无后端，故不列入复刻。
- 系统托盘：`apps/electron_client/src/main/tray/trayManager.ts`，浏览器无等价。
- 自定义标题栏/窗口控制：`apps/frontend/src/components/system/TitleBar.tsx`、`CloseAppBtn.tsx`，Web 用浏览器原生窗口。
- 多账号多窗口：`apps/electron_client/src/main/windows/windowManager.ts`(最多 10 窗)，Web 一期只做单账号。
