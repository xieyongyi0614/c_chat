# Web 端 IM 语聊系统(Next.js)需求文档集 — 设计 Spec

## 目的

把现有 Electron 桌面端 IM 功能一比一复刻到 Web 端(Next.js 搭建)。本 spec 不写业务代码,只规划**需求与任务编排文档集**的结构、模板和内容边界。最终产物是 `docs/web_nextjs/` 下一组「一个大功能一份 md」的需求文档,每份内部再拆成小需求 + 任务编排,风格对齐现有 `docs/requirements/GROUP_CHAT_REQUIREMENTS.md`。

## 已确认的关键决策

1. **架构替代:浏览器直连后端。** 桌面端链路是 `React → IPC → 主进程 → NestJS`;Web 没有主进程,改为浏览器侧 service 模块直接持有 `socket.io-client` + `Axios`,复用同一套 `shared-protobuf`。Next.js 只做页面与路由,不引入 BFF 中间层。
2. **桌面专有能力:Web 等价替代。** 逐项给出「复刻 / 等价替代 / 不复刻」结论,差异显式标注。
3. **文档深度:概述 + 任务编排为主。** 精简重数据建模章节,侧重需求清单(带验收)与阶段编排。
4. **多账号 = 一期单账号。** 桌面端多窗口多账号(最多 10 窗)在 Web 一期不复刻,单标签单账号。
5. **系统托盘、自定义标题栏/窗口控制 = 不复刻。** Web 用浏览器原生窗口。
6. **好友/联系人不列入复刻范围。** 桌面端 `ContactsPanel` 当前是纯 mock UI、无 proto、无 IPC、无后端,仅在 `00_OVERVIEW.md` 的「非复刻范围」点名说明,不单独出文档。

## 文档集结构(方案 A:按功能模块拆分 + 总览)

输出目录 `docs/web_nextjs/`,共 10 份:

```
docs/web_nextjs/
  00_OVERVIEW.md               架构 + 桌面→Web 能力映射总表 + 模块索引 + 推荐开发顺序 + 共享包改造 + 非复刻范围
  01_AUTH_USER.md              登录/注册/自动登录/登出 + 用户资料编辑(含头像上传)+ 用户列表/搜索
  02_TRANSPORT_DATA.md         Socket.IO+Protobuf 直连 + Axios HTTP + IndexedDB 缓存层(替代主进程 + SQLite),所有模块底座
  03_CONVERSATION_LIST.md      会话列表 + folder 筛选(全部/未读/私聊/群组/归档)+ 置顶/未读/定时同步
  04_MESSAGING.md              文本/图片/文件/语音/视频收发 + 已读回执 + 重发 + ack + 本地 pending + 按日期分组
  05_GROUP_CHAT.md             群聊全流程(对照已有 GROUP_CHAT_REQUIREMENTS,标注 Web 差异)
  06_MEDIA_UPLOAD.md           分片上传链路 Web 适配(File API、upload_task 表 → IndexedDB 任务)
  07_MEDIA_PREVIEW.md          独立预览窗口 → 应用内 Lightbox(图片缩放/切换、视频播放、快捷键)
  08_VOICE_MESSAGE.md          录音(MediaRecorder)+ 波形 + 语音播放 + AudioPlayerBridge 对应实现
  09_DESKTOP_CAPABILITY_MAP.md 多窗口/托盘/本地 SQLite/文件系统/独立预览窗口等桌面专有能力的 Web 取舍集中说明
```

`02` 与 `09` 不是「功能」,而是本次复刻最核心的架构差异所在,单独成文以避免在每份功能文档里重复解释传输层替换和桌面能力取舍。

## 每份模块文档的统一模板

功能模块文档(01、03–08)统一用下列骨架,深度为「概述 + 任务编排为主」,精简掉重数据建模章节:

```txt
## 背景            — 这个功能在桌面端是什么、为什么要复刻
## 当前桌面端实现   — 涉及的真实文件 / IPC 方法 / Socket 事件 / 本地表(基于代码列出)
## Web 端目标       — 一比一复刻到什么程度
## 产品需求 + 验收   — 分小需求,每条带验收标准(对标 GROUP_CHAT 风格)
## Web 适配要点     — IPC→browser service、SQLite→IndexedDB、桌面能力取舍
## 任务拆分         — 按子需求拆成可勾选任务 `- [ ]`
## 阶段编排         — 阶段 0/1/2…,每阶段有明确产出
## 风险点
```

- 每条产品需求拆成「小需求 + 验收标准」,直接对应「一个大功能 → 拆成小需求」。
- 任务一律用 `- [ ]` 复选框,初始全部未勾选(本次只规划,不实现)。
- `00_OVERVIEW.md` 和 `09_DESKTOP_CAPABILITY_MAP.md` 是说明性文档,不套用上述骨架,各有专属结构(见下文)。

## 桌面 → Web 能力映射总表(写入 `00` 概要、`09` 展开)

| 桌面端能力                      | 实现位置(真实代码)                                                                      | Web 等价方案                                                                                    | 结论       |
| ------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| `React → IPC → 主进程 → NestJS` | `preload/index.ts`、`ipc/api/*`、`shared-utils` 的 `ipc` Proxy                          | 浏览器侧 browser service 模块直接持有 `socket.io-client` + `Axios`,替换 `window.c_chat.ipcCall` | 等价替代   |
| Protobuf over Socket.IO         | `utils/socket-io-client/`、`shared-protobuf/protoMap.ts`                                | 浏览器端复用同一套 `shared-protobuf`,几乎零改动                                                 | 复刻       |
| 本地 SQLite 缓存                | `db/DatabaseManager.ts`、`db/table/*`(Message/Conversation/Store/UploadTask)            | IndexedDB(Dexie 或原生),保留「离线优先 → 服务端回退」同款逻辑                                   | 等价替代   |
| 独立媒体预览窗口                | `main/windows/mediaPreviewWindow.ts`、`apps/media_preview`                              | 应用内 Lightbox / 路由弹层,无独立窗口                                                           | 等价替代   |
| 多窗口多账号(最多 10 窗)        | `main/windows/windowManager.ts`                                                         | 单标签单账号;多账号靠多浏览器标签;一期只做单账号                                                | 一期不复刻 |
| 系统托盘                        | `main/tray/trayManager.ts`                                                              | 浏览器无等价                                                                                    | 不复刻     |
| 自定义标题栏 / 窗口控制         | `components/system/TitleBar.tsx`、`CloseAppBtn.tsx`                                     | 浏览器原生窗口                                                                                  | 不复刻     |
| 文件选择 / 读取本地路径         | `ipc/api/fileOperationIpc.ts`(`SelectFiles`/`ReadLocalFile`/`SaveFile`/`OpenLocalFile`) | File API / `<input type=file>` / 下载;无本地路径,改用 File/Blob/object URL                      | 等价替代   |
| 语音录制(Electron 音频)         | `services/audioService.ts`、`ipc/api/audioIpc.ts`、`packages/audio-core`                | MediaRecorder + Web Audio API,波形浏览器侧生成                                                  | 等价替代   |
| 自动登录 / token 存储           | `db/table/StoreTable.ts` + `shared-utils` browserCache                                  | `localStorage` / IndexedDB 持久化 token                                                         | 等价替代   |

`09_DESKTOP_CAPABILITY_MAP.md` 逐项展开,给出理由、影响面与一期取舍;其余模块文档引用本表而不重复。

## 各文档内容范围

### 00_OVERVIEW.md(说明性,专属结构)

- Web 项目定位、整体架构图(浏览器直连 NestJS)。
- 桌面 → Web 能力映射总表(上表)。
- 模块索引(01–09 一句话简介 + 链接)。
- 共享包改造点:`shared-protobuf`/`shared-types`/`shared-config`/`shared-utils` 在 Web 端复用与需新增的部分(如 browser service 类型、IndexedDB 行类型)。
- 跨模块推荐开发顺序。
- **非复刻范围**:好友/联系人(纯 mock)、系统托盘、自定义标题栏、多账号多窗口。

### 01_AUTH_USER.md

- 登录、注册(email/username/password/phone/gender)、自动登录、登出。
- 用户资料编辑(昵称、头像上传,对应 `UpdateUserProfile`,Web 端头像走 File API 上传)。
- 用户列表 / 搜索(`GetUserList`,用于新建会话选人)。
- Web 适配:token 持久化用 localStorage/IndexedDB,认证守卫对应 Next.js 路由保护。

### 02_TRANSPORT_DATA.md(底座,所有功能模块依赖)

- browser service 模块:替换 `window.c_chat.ipcCall`,直接持有 `socket.io-client`(JWT 认证、Protobuf 编解码,复用 `protoMap`)+ `Axios`。
- `ClientPaddingRequestsEvent` 请求/响应配对机制在浏览器侧的对应实现。
- IndexedDB 缓存层:对应 Message/Conversation/Store 三表,保留「服务端优先 + 本地回退」逻辑。
- 连接生命周期:登录后建连、断线重连、登出销毁。
- 风险:Protobuf 二进制在浏览器 socket.io 下的兼容、IndexedDB 与 SQLite 查询能力差异。

### 03_CONVERSATION_LIST.md

- 会话列表展示(`GetConversationList` / `GetLocalConversationList`)、私聊与群聊 targetInfo。
- folder 筛选:全部 / 未读 / 私聊 / 群组 / 归档。
- 置顶排序、未读数、新消息置顶、`newConversation` 推送 upsert。
- 定时同步(对照桌面端进入聊天页 + 可见性 + 30s 周期同步)。

### 04_MESSAGING.md

- 收发:文本 / 图片 / 文件 / 语音 / 视频(`SendMessage` / `ResendMessage`)。
- 本地 pending message、ack(`ackSendMessage`)、sending→success/fail 状态流转。
- 已读回执(`ReadMessage` / `ReadMessageResponse`、`lastReadSeq`、未读数)。
- 消息历史(`GetMessageHistory` / `GetLocalMessageHistory`,分页 afterMsgId/beforeMsgId)、按日期分组。
- `newUpdateMessage` 实时更新。

### 05_GROUP_CHAT.md

- 直接对照已有 `docs/requirements/GROUP_CHAT_REQUIREMENTS.md`(创建群、群会话列表、群消息、群资料、成员管理)。
- 复用 `CreateGroup`/`GetGroupDetail`/`UpdateGroup`/`InviteGroupMembers`/`LeaveGroup`/`DismissGroup`。
- 仅标注 Web 差异(成员选择 UI、群详情弹窗/侧栏 → Web 对应组件),不重复后端逻辑。

### 06_MEDIA_UPLOAD.md

- 分片上传链路 Web 适配:`/upload/init`→`/upload/chunk`→`/upload/status`→`/upload/complete`。
- 文件来源从本地路径改为 File API(File/Blob 分片切割);本地 `upload_task` 表 → IndexedDB 任务表。
- 保留秒传、断点续传、进度、失败重试;对照 `MEDIA_UPLOAD_REQUIREMENTS.md` 的方案 B(服务端 complete 后直接建消息)。

### 07_MEDIA_PREVIEW.md

- 独立 Electron 预览窗口 → 应用内 Lightbox / 路由弹层。
- 图片:适窗、缩放、拖拽、旋转、上一张/下一张、快捷键。
- 视频:播放/暂停、进度、音量、静音、倍速、快捷键。
- 资源:有 `fileUrl` 用远端;无则用 File/Blob object URL(无本地路径,不走 `ReadLocalFile`)。
- 对照 `MEDIA_PREVIEW_REQUIREMENTS.md`,显式说明无独立窗口、无多窗口复用语义的差异。

### 08_VOICE_MESSAGE.md

- 录音:MediaRecorder 替代 Electron 音频采集;录音按钮(`RecordingButton`)对应组件。
- 波形生成(Web Audio API)、语音消息展示与播放(`AudioMessage`、`AudioPlayerBridge`、`audioPlayerStore`)。
- 对应桌面端 `saveVoice`/`getAudioInfoByLocalPath`:Web 端在浏览器侧生成 duration/waveform 后随上传链路提交。

### 09_DESKTOP_CAPABILITY_MAP.md(说明性,专属结构)

- 逐项展开能力映射总表的每一行:能力描述、桌面端实现、Web 等价方案、结论(复刻/等价替代/不复刻)、理由、影响面、一期取舍。
- 集中说明:多窗口多账号、系统托盘、自定义标题栏、本地 SQLite、本地文件路径、独立预览窗口、Electron 音频。

## 跨模块推荐开发顺序

`02 传输层底座` → `01 认证/用户` → `03 会话列表` → `04 消息` → `08 语音` / `06 上传` / `07 预览`(可并行)→ `05 群聊` → `09 收尾对照核对`。

理由:`02` 是所有功能的底座,必须先打通直连与缓存;`01` 提供登录态;`03`/`04` 是 IM 主干;媒体三项依赖消息链路;群聊复用前述全部能力;`09` 在收尾时核对桌面能力取舍是否落实。

## 测试与验证策略

本 spec 阶段只产出文档,不写代码,故无构建/测试可跑。每份模块文档的「产品需求 + 验收」即为后续实现阶段的验收依据;「阶段编排」的每阶段产出即为可验证里程碑。文档写完后做一次自检(占位符 / 一致性 / 范围 / 歧义)。

## 非目标

- 不写任何业务代码、不搭建 Next.js 工程。
- 不复刻好友/联系人、系统托盘、自定义标题栏、多账号多窗口。
- 不设计后端改造(后端 NestJS 复用,Web 直连)。
- 不做移动端(React Native)规划(见 [[project_multi_platform_plan]],属另一条线)。
