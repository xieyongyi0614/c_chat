# Web 端需求重构总览

## 背景

`docs/web_nextjs` 是 Web 端 IM 需求的模块化入口。上一版文档已经按认证、传输、会话、消息、群聊、媒体等方向拆开，但内容里仍然混入了平行网络层和重复基础能力，容易偏离当前 monorepo 已有 packages。

本次重构只做需求文档整理，不写业务代码。目标是把 Web 端需求拆成多个可独立推进的模块，每个模块有清晰的背景、当前基础、目标、产品需求和可勾选任务编排，后续实现时可以按模块逐项完成。

## 当前基础

### 共享能力

- `packages/shared-api`：统一承载 HTTPS 与 WebSocket 请求，已提供 `createApiClient`、`HttpClient`、`RealtimeClient`、`AuthService`、`UploadService`、请求配对和连接生命周期基础能力。
- `packages/shared-protobuf`：统一承载 WebSocket 协议、`Chat.proto`、`protoMap`、客户端和服务端事件映射。
- `packages/shared-types`：统一承载 IPC、DB、API、Socket、上传、消息等类型定义。
- `packages/shared-config`：统一承载端口、消息类型、上传分片大小、错误码等常量。
- `packages/shared-utils`：承载通用工具和桌面端 IPC proxy；Web 端不应复刻 IPC，只应在调用层适配共享 API。
- `packages/audio-core`：统一承载录音、波形、播放等音频核心能力。
- `packages/chat_ui`：统一承载 shadcn/Tailwind 基础 UI 组件与主题。

### 桌面端能力边界

桌面端链路：

```txt
React 渲染进程 -> IPC -> Electron 主进程 -> shared-api/shared-protobuf -> NestJS
```

Web 端目标链路：

```txt
React/Next.js -> shared-api Web 运行时适配 -> shared-protobuf -> NestJS
```

差异只在运行时环境：Web 没有 Electron 主进程、SQLite、本地路径、独立系统窗口、托盘和自定义窗口控制。通用协议、请求、类型、上传、音频、UI 基础能力都应复用 packages。

## 目标

### 一期目标

- 建立 Web 端需求模块清单，每个大模块一个 Markdown 文件。
- 每份模块文档采用统一结构：背景、当前基础、目标、产品需求、Web 适配要点、任务编排、风险点。
- 所有任务编排使用 `- [ ]` 复选框，方便后续实施时打勾。
- 明确 `shared-api`、`shared-protobuf`、`audio-core`、`chat_ui` 的职责边界，不再规划重复网络层、协议层、音频层或 UI 基础组件。

### 二期方向

- Web 端实现阶段可在每个模块文档下继续追加“已完成记录”和“联调问题”。
- 如后续出现移动端、PWA、Service Worker 推送、多账号等需求，应另起专项文档，不混入一期 Web IM 主流程。

## 模块拆分

| 模块           | 文档                                                         | 说明                                                     |
| -------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 总览           | [00_OVERVIEW.md](00_OVERVIEW.md)                             | 模块入口、共享包边界、推荐顺序                           |
| 认证与用户     | [01_AUTH_USER.md](01_AUTH_USER.md)                           | 登录、注册、自动登录、登出、资料编辑、用户搜索           |
| 网络与缓存底座 | [02_TRANSPORT_DATA.md](02_TRANSPORT_DATA.md)                 | `shared-api`、`shared-protobuf`、IndexedDB、连接生命周期 |
| 会话列表       | [03_CONVERSATION_LIST.md](03_CONVERSATION_LIST.md)           | 会话拉取、筛选、未读、置顶、推送同步                     |
| 消息收发       | [04_MESSAGING.md](04_MESSAGING.md)                           | 文本、媒体、pending、ack、已读、历史分页                 |
| 群聊           | [05_GROUP_CHAT.md](05_GROUP_CHAT.md)                         | 创建群、群会话、群消息、群资料、成员管理                 |
| 媒体上传       | [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)                     | File API、分片、秒传、续传、服务端建消息                 |
| 媒体预览       | [07_MEDIA_PREVIEW.md](07_MEDIA_PREVIEW.md)                   | 图片/视频 Lightbox，替代 Electron 独立窗口               |
| 语音消息       | [08_VOICE_MESSAGE.md](08_VOICE_MESSAGE.md)                   | 录音、波形、上传、播放，复用 `audio-core`                |
| 桌面能力取舍   | [09_DESKTOP_CAPABILITY_MAP.md](09_DESKTOP_CAPABILITY_MAP.md) | 桌面专有能力在 Web 的复刻、替代和放弃                    |

## 共享约束

- 网络请求只能走 `packages/shared-api`。如果缺少业务 service，优先在 `shared-api` 内补齐，不在 Web 应用里重写一套 HTTP/WebSocket client。
- WebSocket 协议只能走 `packages/shared-protobuf`。新增事件或消息体必须先更新 proto 与 `protoMap`。
- 数据类型优先复用 `packages/shared-types`。不要在 Web 应用里维护一套同名但不同结构的类型。
- 录音、波形、播放优先复用或扩展 `packages/audio-core`。不要在页面里散落音频算法。
- 基础 UI 优先使用 `packages/chat_ui` 的 shadcn 组件。Dialog、Sheet、Popover、Form、Button、Input、Tabs、Tooltip、ScrollArea 等不要手写。
- Web 本地缓存使用 IndexedDB；它替代 Electron SQLite，但不改变服务端契约。
- Web 文件来源使用 File/Blob/object URL；不再依赖 Electron `filePath`、`ReadLocalFile`、`OpenLocalFile`。

## 推荐开发顺序

1. 先做 [02 网络与缓存底座](02_TRANSPORT_DATA.md)：打通 `shared-api` Web 运行时适配、token、RealtimeClient、IndexedDB。
2. 再做 [01 认证与用户](01_AUTH_USER.md)：获得稳定登录态和用户资料。
3. 接着做 [03 会话列表](03_CONVERSATION_LIST.md) 与 [04 消息收发](04_MESSAGING.md)：完成 IM 主链路。
4. 然后做 [06 媒体上传](06_MEDIA_UPLOAD.md)：图片、文件、视频、头像和语音都依赖它。
5. 再并行做 [07 媒体预览](07_MEDIA_PREVIEW.md) 与 [08 语音消息](08_VOICE_MESSAGE.md)。
6. 最后做 [05 群聊](05_GROUP_CHAT.md)：复用前面会话、消息、上传、用户搜索能力。
7. 收尾核对 [09 桌面能力取舍](09_DESKTOP_CAPABILITY_MAP.md)，确认不复刻项没有被误实现。

## 非一期范围

- 不做 Electron 系统托盘、自定义标题栏、窗口控制。
- 不做桌面端多窗口多账号；Web 一期按单标签单账号处理。
- 不做联系人/好友体系，因为当前桌面端联系人页仍是 mock UI，没有完整后端契约。
- 不新增 BFF，不另起一套 Web 专用后端响应结构。
- 不为 Web 端重复实现 shared-api、shared-protobuf、audio-core、chat_ui 已覆盖的能力。

## 总体任务编排

### 阶段 0：需求边界重构

- [ ] 确认模块拆分为 00-09 十份文档。
- [ ] 确认所有模块都引用共享包职责边界。
- [ ] 删除或改写重复网络层和重复基础能力的表述。
- [ ] 确认每份文档都有可勾选任务编排。

产出：

- Web 端需求文档集结构清晰，后续可按模块推进。

### 阶段 1：底座先行

- [ ] 完成 `shared-api` Web 运行时 adapter 需求确认。
- [ ] 完成 `shared-protobuf` 事件映射和请求配对确认。
- [ ] 完成 IndexedDB 缓存边界确认。

产出：

- 认证、会话、消息、群聊可以共用同一套请求和缓存底座。

### 阶段 2：IM 主链路

- [ ] 完成认证与用户模块。
- [ ] 完成会话列表模块。
- [ ] 完成消息收发模块。

产出：

- 用户可登录 Web，查看会话，发送和接收文本消息。

### 阶段 3：媒体与语音

- [ ] 完成媒体上传模块。
- [ ] 完成媒体预览模块。
- [ ] 完成语音消息模块。

产出：

- 图片、文件、视频、语音消息闭环可用。

### 阶段 4：群聊和收尾

- [ ] 完成群聊模块。
- [ ] 核对桌面能力取舍。
- [ ] 补齐各模块 loading、empty、error 和异常路径。

产出：

- Web 端一期 IM 主流程可验收。

## 风险点

- 如果 Web 端绕过 `shared-api` 单独写网络层，后续桌面端、Web 端和服务端协议会分叉。
- 如果 Web 端绕过 `shared-protobuf` 直接手写 socket payload，会破坏 WebSocket 协议单一来源。
- 如果页面私有代码手写 shadcn 基础交互，会造成 UI 体系不一致和 a11y 回退。
- IndexedDB 是异步事务模型，不能照搬桌面端 SQLite 的同步读取假设。
- Web 浏览器没有本地路径、托盘、独立 Electron 窗口和主进程，相关能力必须显式取舍。
