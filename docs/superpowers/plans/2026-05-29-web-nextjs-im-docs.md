# Web 端 IM 语聊系统(Next.js)需求文档集 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `docs/web_nextjs/` 下产出 10 份「一功能一文档」的需求与任务编排文档,把 Electron 桌面端 IM 功能一比一复刻到 Next.js Web 端做规划(只写文档,不写业务代码)。

**Architecture:** 浏览器直连后端(Socket.IO + Protobuf + Axios 复用 `shared-protobuf`,替换桌面端 IPC→主进程链路);桌面专有能力(SQLite、文件系统、独立预览窗口、多窗口、托盘)给出 Web 等价方案或标注不复刻。每份模块文档遵循统一模板,内部拆成小需求 + 验收 + 阶段编排。

**Tech Stack:** Markdown 文档;参考源码 `apps/electron_client`、`apps/frontend`、`packages/shared-*`;对照已有 `docs/requirements/*.md` 风格。

> **本计划是文档生成计划,非代码计划。** 每个 Task 产出一份 md 文档。"验证"为内容自检(章节齐全、链接可达、无占位符 `TODO/TBD`),无测试框架可跑。每份文档先读真实源码再落笔,确保文件名/IPC 方法名/Socket 事件名与代码一致。

---

## 统一文档模板(功能模块文档 01、03–08 通用)

每份功能模块文档必须包含以下章节,顺序固定:

```txt
# <模块中文名>需求分析与任务编排
## 背景
## 当前桌面端实现   —— 真实文件 / IPC 方法 / Socket 事件 / 本地表
## Web 端目标
## 产品需求与验收   —— 每个小需求一个 ### 小节,含「验收标准:」列表
## Web 适配要点     —— IPC→browser service、SQLite→IndexedDB、桌面能力取舍
## 任务拆分         —— 服务端(若涉及)/ 客户端,均用 `- [ ]`
## 阶段编排         —— 阶段 0/1/2…,每阶段含「产出:」
## 风险点
```

说明性文档 `00_OVERVIEW.md`、`09_DESKTOP_CAPABILITY_MAP.md` 不套此模板,结构见各自 Task。

---

## 文件结构(将创建的文件)

| 文件                                           | 职责                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/web_nextjs/00_OVERVIEW.md`               | 总览:Web 定位、架构图、能力映射总表、模块索引、共享包改造、开发顺序、非复刻范围 |
| `docs/web_nextjs/01_AUTH_USER.md`              | 认证与用户:登录/注册/自动登录/登出、资料编辑、用户列表                          |
| `docs/web_nextjs/02_TRANSPORT_DATA.md`         | 传输与数据底座:Socket+Protobuf 直连、Axios、IndexedDB 缓存                      |
| `docs/web_nextjs/03_CONVERSATION_LIST.md`      | 会话列表:folder 筛选、置顶、未读、定时同步                                      |
| `docs/web_nextjs/04_MESSAGING.md`              | 消息收发:多类型消息、已读、重发、ack、pending、日期分组                         |
| `docs/web_nextjs/05_GROUP_CHAT.md`             | 群聊:对照已有 GROUP_CHAT_REQUIREMENTS,标注 Web 差异                             |
| `docs/web_nextjs/06_MEDIA_UPLOAD.md`           | 媒体上传:分片链路 Web 适配、File API、IndexedDB 任务表                          |
| `docs/web_nextjs/07_MEDIA_PREVIEW.md`          | 媒体预览:独立窗口 → 应用内 Lightbox                                             |
| `docs/web_nextjs/08_VOICE_MESSAGE.md`          | 语音消息:MediaRecorder 录音、波形、播放                                         |
| `docs/web_nextjs/09_DESKTOP_CAPABILITY_MAP.md` | 桌面能力 Web 取舍集中说明                                                       |

执行顺序按依赖:先 `00`(总览+映射表,后续文档引用它),再 `02`(底座),再 `01/03/04`,再 `06/08/07`,再 `05`,最后 `09`。本计划 Task 顺序即按此排列。

---

## Task 1: 00_OVERVIEW.md(总览 + 能力映射总表)

**Files:**

- Create: `docs/web_nextjs/00_OVERVIEW.md`
- 参考源:`docs/PROJECT.md`、`apps/electron_client/src/main/`、`packages/shared-protobuf/src/protoMap.ts`、`apps/frontend/src/pages/contacts/ContactsPanel.tsx`

- [ ] **Step 1: 先读参考源,核对真实路径与事件名**

Run: 读取 `docs/PROJECT.md`、`apps/electron_client/src/main/windows/windowManager.ts`、`apps/electron_client/src/main/tray/trayManager.ts`、`packages/shared-protobuf/src/protoMap.ts`
目的:确认架构描述、窗口/托盘实现位置、proto 事件清单与 spec 一致。

- [ ] **Step 2: 写 00_OVERVIEW.md**

内容必须包含以下小节(顺序固定):

1. `## Web 项目定位` —— 一段:Next.js 复刻 Electron IM,浏览器直连现有 NestJS 后端,复用 monorepo 共享包;Electron 仓库与 Web 仓库共用 `packages/`。
2. `## 整体架构` —— 用代码块画链路对比:

```txt
桌面端: React(渲染进程) → contextBridge(window.c_chat.ipcCall) → 主进程(IPC handler) → Axios/Socket.IO+Protobuf → NestJS
Web 端: React(Next.js) → browser service 模块(直接持有 socket.io-client + Axios + Protobuf 编解码) → NestJS
```

3. `## 桌面 → Web 能力映射总表` —— 复制 spec 中的 9 行映射表(桌面端能力 / 实现位置 / Web 等价方案 / 结论)。表头四列:`桌面端能力 | 实现位置 | Web 等价方案 | 结论`。9 行内容来自 spec(`2026-05-29-web-nextjs-im-design.md`)的同名表。
4. `## 模块索引` —— 列表,每行 `[01 认证与用户](01_AUTH_USER.md) —— 一句话` 直到 09,链接用相对路径(同目录直接文件名)。
5. `## 共享包改造点` —— 列出:`shared-protobuf`(浏览器端复用 protoMap,几乎零改);`shared-types`(IPC 方法签名 → browser service 方法签名复用;新增 IndexedDB 行类型若需要);`shared-config`(端口/通道常量 Web 端取舍);`shared-utils`(`ipc` Proxy 在 Web 端的对应封装、browserCache token 存储)。
6. `## 推荐开发顺序` —— `02 → 01 → 03 → 04 → 06 → 08/07 → 05 → 09`,附一句理由(语音/预览依赖上传链路)。
7. `## 非复刻范围` —— 明确列出:好友/联系人(`apps/frontend/src/pages/contacts/ContactsPanel.tsx` 当前为 `mockContacts` 纯 mock,无 proto/IPC/后端);系统托盘(`main/tray/`);自定义标题栏与窗口控制(`components/system/TitleBar.tsx`、`CloseAppBtn.tsx`);多账号多窗口(`windowManager.ts`,最多 10 窗,一期单账号)。

- [ ] **Step 3: 自检内容**

核对:7 个小节齐全;映射表 9 行;模块索引 9 条链接均指向将创建的文件名;非复刻范围 4 项均带真实文件路径;全文无 `TODO`/`TBD`/`待补充`。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/00_OVERVIEW.md
git commit -m "docs(web): 新增 web nextjs 复刻总览与桌面能力映射"
```

---

## Task 2: 02_TRANSPORT_DATA.md(传输与数据底座)

**Files:**

- Create: `docs/web_nextjs/02_TRANSPORT_DATA.md`
- 参考源:`apps/electron_client/src/utils/socket-io-client/`、`apps/electron_client/src/utils/axios/`、`apps/electron_client/src/db/DatabaseManager.ts`、`apps/electron_client/src/db/table/*`、`packages/shared-protobuf/src/protoMap.ts`、`packages/shared-utils/lib/ipc/`、`packages/shared-types/src/lib/socket.types.ts`

- [ ] **Step 1: 读参考源,确认底座真实结构**

读取 socket-io-client 目录、axios 目录、`DatabaseManager.ts`、`ConversationTable.ts`/`MessageTable.ts`/`StoreTable.ts` 表结构、`protoMap.ts`(`ClientToServiceEvent`/`ServiceToClientEvent`/`ClientPaddingRequestsEvent`/`clientDecodeProtoMap`)、`shared-utils` 的 `ipcRenderer.ts`/`ipcClient.ts`。
目的:把"桌面端怎么做的"写准。

- [ ] **Step 2: 写 02_TRANSPORT_DATA.md(套用统一模板)**

各章节必含内容:

- `## 背景` —— 这是所有功能模块的底座;桌面端传输与缓存由主进程承担,Web 没有主进程,需在浏览器侧重建。
- `## 当前桌面端实现` —— 列出真实结构:
  - Socket:`utils/socket-io-client/`,每窗口独立连接,JWT 认证,Protobuf 二进制编解码,`Command { event, userId, client, requestId, payload[] }` 信封。
  - 事件映射:`protoMap.ts` 的 `ClientToServiceEvent`(ping/getUserInfo/getUserList/createConversation/sendMessage/getConversationList/getMessageHistory/readMessage/createGroup/getGroupDetail/updateGroup/inviteGroupMembers/leaveGroup/dismissGroup)与 `ServiceToClientEvent`(pong/error/getUserInfoResponse/getUserListResponse/getConversationListResponse/getMessageHistoryResponse/ReadMessageResponse/createGroupResponse/getGroupDetailResponse/groupOperationResponse/ackSendMessage/newUpdateMessage/newConversation/sendFileUploadComplete)。
  - 请求/响应配对:`ClientPaddingRequestsEvent` + `ClientPaddingRequestsCallback`。
  - HTTP:`utils/axios/`,自动注入 token,统一错误处理。
  - 本地缓存:`db/DatabaseManager.ts` + 三张表 `StoreTable`(token/用户信息 KV)、`ConversationTable`、`MessageTable`(UPSERT 去重),`UploadTaskTable`(上传任务,归 06)。
  - IPC 入口:`shared-utils` 的 `ipc` Proxy(`ipcClient.ts`/`ipcRenderer.ts`)对应 `window.c_chat.ipcCall`。
- `## Web 端目标` —— 浏览器侧 browser service 直接持有 socket.io-client + Axios,复用 `shared-protobuf`;IndexedDB 复刻三表;对外暴露与桌面端 IPC 方法签名一致的调用接口,使上层页面尽量无感。
- `## 产品需求与验收` —— 拆成以下小需求,每个带验收:
  - `### Socket 直连与 Protobuf 编解码`:验收 —— 登录后用 JWT 建连;客户端事件用 `protoMap` 编码为 `Command`;响应按 `requestId` 回填;二进制 payload 在浏览器 socket.io 下正确收发。
  - `### 请求/响应配对`:验收 —— 复刻 `ClientPaddingRequestsEvent` 语义,`getXxx` 请求能等到对应 `xxxResponse`;超时与错误(`error` 事件)有回退。
  - `### HTTP 客户端`:验收 —— Axios 实例自动注入 token;401 等错误统一处理;baseURL 指向 NestJS。
  - `### IndexedDB 缓存层`:验收 —— Conversation/Message/Store 三类数据可读写;消息按会话+msgId 去重(对应 UPSERT 唯一索引);保留「服务端优先 → 本地回退」。
  - `### 连接生命周期`:验收 —— 登录建连、断线自动重连、登出销毁连接与敏感缓存。
- `## Web 适配要点` —— `window.c_chat.ipcCall` → browser service 模块;主进程单连接(每窗口)→ 浏览器单连接(单标签单账号);SQLite 同步查询 → IndexedDB 异步事务;`better-sqlite3` 唯一索引 UPSERT → IndexedDB keyPath + 手动 upsert;引用 `09` 说明多账号一期不复刻。
- `## 任务拆分` —— 客户端(均 `- [ ]`):搭 browser service 骨架;接入 socket.io-client + JWT;接入 Protobuf 编解码复用 protoMap;实现请求/响应配对;接入 Axios;实现 IndexedDB 三表封装;实现服务端优先+本地回退读取;实现连接生命周期。
- `## 阶段编排` —— 阶段0 接口边界确认(browser service 对外签名对齐 IPC);阶段1 Socket+Protobuf 直连打通(产出:可收发一条 ping/pong);阶段2 HTTP+token;阶段3 IndexedDB 缓存;阶段4 生命周期与异常。每阶段含「产出:」。
- `## 风险点` —— Protobuf 二进制在浏览器 socket.io transport 的兼容;IndexedDB 异步事务与桌面端同步查询的时序差异;token 放 localStorage 的 XSS 风险;单标签多账号不支持。

- [ ] **Step 3: 自检内容**

核对:模板 8 章节齐全;事件清单与 `protoMap.ts` 一致;三表名称与 `db/table/` 一致;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/02_TRANSPORT_DATA.md
git commit -m "docs(web): 新增传输与数据底座需求(socket+protobuf 直连/IndexedDB)"
```

---

## Task 3: 01_AUTH_USER.md(认证与用户)

**Files:**

- Create: `docs/web_nextjs/01_AUTH_USER.md`
- 参考源:`apps/electron_client/src/ipc/api/authIpc.ts`、`packages/shared-types/src/lib/ipc/ipcCallTypes/authPreloadTypes.ts`、`packages/shared-types/src/lib/ipc/apiTypes/authTypes.ts`、`apps/frontend/src/pages/auth/*`、`apps/frontend/src/router/CheckAuth.tsx`、`apps/frontend/src/stores/userStore.ts`、`apps/frontend/src/layout/components/LeftSidebar/ProfileDialog.tsx`、`AccountMenu.tsx`

- [ ] **Step 1: 读参考源,确认认证方法签名**

读取 `authPreloadTypes.ts`(`SignIn`/`SignUp`/`GetUserInfo`/`UpdateUserProfile`/`AutoSignIn`/`Logout`/`GetUserList`)、`authTypes.ts`(`PostSignInParams`/`PostSignUpParams`/`GetUserInfoResponse`/`UpdateUserProfileParams`)、auth 页面、`CheckAuth.tsx`、`userStore.ts`、`ProfileDialog.tsx`。

- [ ] **Step 2: 写 01_AUTH_USER.md(套用统一模板)**

各章节必含:

- `## 背景` —— 认证是进入 IM 的前置;桌面端走 IPC 调主进程 HTTP,Web 浏览器直连。
- `## 当前桌面端实现` —— IPC 方法(来自 `authPreloadTypes.ts`):`SignIn(email,password)→void`、`SignUp(email,username,password,phone?,gender?)→void`、`GetUserInfo()→GetUserInfoResponse`、`UpdateUserProfile({nickname?,avatarUrl?,avatarFilePath?})`、`AutoSignIn()→void`、`Logout()→void`、`GetUserList(分页)→ResponseList<UserListItem>`;页面 `pages/auth/`(`UserSignInForm`/`UserSignUpForm`,react-hook-form+zod);守卫 `CheckAuth.tsx`;状态 `userStore.ts`;资料编辑 `ProfileDialog.tsx`;token 经主进程 `StoreTable` 持久化。
- `## Web 端目标` —— 一比一复刻登录/注册/自动登录/登出/资料编辑/用户列表;调用从 IPC 改为 browser service(见 [02_TRANSPORT_DATA.md](02_TRANSPORT_DATA.md))。
- `## 产品需求与验收` —— 小需求:
  - `### 登录`:验收 —— email+password 表单校验(zod);成功存 token、跳聊天页;失败 toast 错误。
  - `### 注册`:验收 —— email/username/password 必填,phone/gender 可选,gender 取值 0女/1男/2其他;成功后落登录态。
  - `### 自动登录`:验收 —— 启动读持久化 token,有效则免登录进入;无效清除并回登录页。
  - `### 登出`:验收 —— 清 token、断 socket、清敏感缓存、回登录页。
  - `### 用户资料编辑`:验收 —— 改昵称;头像 Web 端用 File API 选图并经上传链路得 URL(对应桌面端 `avatarFilePath` 主进程上传),提交 `UpdateUserProfile`;成功后刷新 `userStore`。
  - `### 用户列表/搜索`:验收 —— 分页拉 `GetUserList`,用于新建会话选人。
- `## Web 适配要点` —— 路由守卫由 `CheckAuth.tsx` → Next.js 路由保护(middleware 或客户端守卫);token 由 `StoreTable` → localStorage/IndexedDB;头像 `avatarFilePath`(本地路径)→ File 对象走上传链路,无本地路径。
- `## 任务拆分` —— 客户端(`- [ ]`):登录页+校验;注册页+校验;自动登录;登出清理;资料编辑(含头像 File 上传);用户列表分页;路由守卫;userStore 对接 browser service。
- `## 阶段编排` —— 阶段0 复用 browser service 认证方法签名;阶段1 登录/注册/守卫(产出:可登录进聊天页);阶段2 自动登录/登出;阶段3 资料编辑+头像;阶段4 用户列表/搜索。每阶段含「产出:」。
- `## 风险点` —— token 存储 XSS;头像上传依赖 06 上传链路(标注依赖);Next.js SSR 与客户端登录态水合时序。

- [ ] **Step 3: 自检内容**

核对:模板齐全;IPC 方法签名与 `authPreloadTypes.ts` 一致(尤其 SignUp 参数、UpdateUserProfile 的 avatarFilePath);gender 取值说明与 `authTypes.ts` 注释一致;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/01_AUTH_USER.md
git commit -m "docs(web): 新增认证与用户需求(登录/注册/资料/用户列表)"
```

---

## Task 4: 03_CONVERSATION_LIST.md(会话列表)

**Files:**

- Create: `docs/web_nextjs/03_CONVERSATION_LIST.md`
- 参考源:`apps/electron_client/src/ipc/api/chatIpc/conversationIpc.ts`、`packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`、`packages/shared-types/src/lib/db/ConversationTable.ts`、`apps/frontend/src/stores/chat/chatStore.ts`、`apps/frontend/src/pages/chats/components/left/*`、`apps/frontend/src/pages/chats/hooks/useConversationData.ts`、`apps/frontend/src/layout/components/LeftSidebar/*`

- [ ] **Step 1: 读参考源,确认会话方法与 folder**

读取 `conversationIpc.ts`、`chatPreloadTypes.ts`(`GetConversationList`/`GetLocalConversationList`/`CreateConversation`)、`ConversationTable.ts`(`LocalConversationListItem` 字段、`type` 私聊/群聊)、`chatStore.ts`(`selectedConversationFolder: 'all'|'unread'|'personal'|'groups'|'archive'`、`pinConversation`、未读处理)、左栏组件、`useConversationData.ts`。

- [ ] **Step 2: 写 03_CONVERSATION_LIST.md(套用统一模板)**

各章节必含:

- `## 背景` —— 会话列表是聊天主界面左栏入口。
- `## 当前桌面端实现` —— IPC:`GetConversationList(分页)`、`GetLocalConversationList`、`CreateConversation(targetId)`;本地表 `ConversationTable`(`LocalConversationListItem`,含 `type` 1私聊/2群聊、unreadCount、置顶、归档、lastMsg 等);状态 `chatStore.ts`(folder 五值、`pinConversation`、未读清零、新消息置顶);组件 `left/ConversationList.tsx`/`ConversationItem.tsx`/`LeftColumn.tsx`/`LeftColumnHeader.tsx`;`newConversation` 推送 upsert;定时同步(进入聊天页/可见性/30s)。
- `## Web 端目标` —— 一比一复刻列表展示、folder 筛选、置顶、未读、定时同步;数据走 browser service + IndexedDB。
- `## 产品需求与验收` —— 小需求:
  - `### 会话列表展示`:验收 —— 私聊显示对端 targetInfo、群聊显示群名/群头像;最后一条消息文案统一(`[图片]`/`[视频]`/`[文件]`/`[音频]`);时间格式化。
  - `### folder 筛选`:验收 —— 全部/未读/私聊(type=1)/群组(type=2)/归档 五个 folder 正确过滤。
  - `### 置顶与排序`:验收 —— 置顶会话排前;新消息到达置顶到非置顶区首部。
  - `### 未读数`:验收 —— 按会话维护未读;进入会话清零;角标显示。
  - `### 新会话推送`:验收 —— 收到 `newConversation`/`newUpdateMessage` 时本地列表 upsert。
  - `### 定时同步`:验收 —— 进入聊天页、页面可见、每 30s 各同步一次,补齐离线期被拉群/资料变更。
- `## Web 适配要点` —— IPC → browser service;本地表 → IndexedDB conversation store;可见性用 `document.visibilitychange`;无多窗口,单标签维护一份列表。
- `## 任务拆分` —— 客户端(`- [ ]`):列表组件;folder 过滤;置顶排序;未读角标与清零;`newConversation` upsert;定时同步;服务端优先+本地回退拉取。
- `## 阶段编排` —— 阶段0 数据形态确认(LocalConversationListItem 对齐);阶段1 列表展示+本地回退(产出:能看到会话列表);阶段2 folder+置顶+未读;阶段3 推送 upsert+定时同步。每阶段含「产出:」。
- `## 风险点` —— 未读数需按服务端口径,不能纯客户端自增;定时同步与实时推送的 upsert 竞态;归档/置顶状态本地与服务端一致性。

- [ ] **Step 3: 自检内容**

核对:folder 五值与 `chatStore.ts` 一致;IPC 方法名与 `chatPreloadTypes.ts` 一致;最后消息文案与 GROUP_CHAT 文档的 `generateLastMsgContent` 口径一致;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/03_CONVERSATION_LIST.md
git commit -m "docs(web): 新增会话列表需求(folder/置顶/未读/定时同步)"
```

---

## Task 5: 04_MESSAGING.md(消息收发)

**Files:**

- Create: `docs/web_nextjs/04_MESSAGING.md`
- 参考源:`apps/electron_client/src/ipc/api/chatIpc/messageIpc.ts`、`packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`、`packages/shared-types/src/lib/db/MessageTableTypes.ts`、`apps/frontend/src/stores/chat/messageStore.ts`、`apps/frontend/src/pages/chats/components/middle/message/*`、`apps/frontend/src/pages/chats/components/middle/input/*`、`apps/frontend/src/pages/chats/hooks/useChatsData.ts`

- [ ] **Step 1: 读参考源,确认消息方法与状态**

读取 `messageIpc.ts`、`chatPreloadTypes.ts`(`SendMessage`/`ResendMessage`/`ReadMessage`/`GetMessageHistory`/`GetLocalMessageHistory`、`SendMessageParams`、`ReadMessageParams`、`ReadMessageResult`、`ResendMessageParams`)、`MessageTableTypes.ts`(`MessageTypeEnum`、`MessageStatus`、`LocalMessageListItem`)、`messageStore.ts`(按日期分组)、message 组件(`MessageItem`/`MessageGroup`/`MessageDate`/`MessageStatusIcon`/types 下 Text/Image/File/Audio/Video)、input 组件(`ChatInput`/`AttachmentList`/`EmojiPicker`/`RecordingButton`)。

- [ ] **Step 2: 写 04_MESSAGING.md(套用统一模板)**

各章节必含:

- `## 背景` —— 消息收发是 IM 核心主干。
- `## 当前桌面端实现` —— IPC:`SendMessage({conversationId?,targetId?,content,files?,fileId?,mediaGroupId?})→LocalMessageListItem[]`、`ResendMessage({clientMsgId})`、`ReadMessage({conversationId,messageId?})→{conversationId,lastReadSeq,unreadCount}`、`GetMessageHistory({conversationId,pageSize?,afterMsgId?,beforeMsgId?,limit?})`、`GetLocalMessageHistory`;Socket:`ackSendMessage`(发送回执)、`newUpdateMessage`(实时更新)、`ReadMessageResponse`;本地表 `MessageTable`(UPSERT 去重);消息类型 `MessageTypeEnum`(文本/图片/文件/语音/视频)、状态 `MessageStatus`(sending/success/fail);状态 `messageStore.ts` 按日期分组;组件如上。
- `## Web 端目标` —— 一比一复刻多类型消息收发、本地 pending、ack 状态流转、已读、历史分页、日期分组、实时更新。
- `## 产品需求与验收` —— 小需求:
  - `### 文本消息收发`:验收 —— 输入发送,本地立即 pending;收到 ack 转 success,失败转 fail;对端经 `newUpdateMessage` 收到。
  - `### 图片/文件/视频消息`:验收 —— 选文件后本地 pending 展示,经上传链路(见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md))完成后服务端建消息并推送;支持 `mediaGroupId` 图片组。
  - `### 语音消息`:验收 —— 见 [08_VOICE_MESSAGE.md](08_VOICE_MESSAGE.md),录音后随消息发送。
  - `### 消息状态流转`:验收 —— sending→success/fail 图标(`MessageStatusIcon`);fail 可重发(`ResendMessage`,按 `clientMsgId`)。
  - `### 已读回执`:验收 —— 进入/阅读会话调 `ReadMessage`,更新 `lastReadSeq` 与未读数;`ReadMessageResponse` 同步。
  - `### 消息历史与分页`:验收 —— 进入会话拉历史(`afterMsgId`/`beforeMsgId` 翻页);服务端优先、本地回退(`GetLocalMessageHistory`);按日期分组(`MessageDate`/`MessageGroup`)。
  - `### 实时更新`:验收 —— `newUpdateMessage` 到达时插入/更新对应会话消息并刷新列表最后一条。
- `## Web 适配要点` —— IPC → browser service;`files` 来源由本地路径 → File 对象;本地 pending 与上传任务存 IndexedDB;EmojiPicker/ChatInput 直接复用前端组件。
- `## 任务拆分` —— 客户端(`- [ ]`):文本发送+pending+ack;消息状态图标与重发;已读回执;历史分页+本地回退;日期分组;`newUpdateMessage` 处理;多类型消息渲染组件接入(文本/图片组/文件/语音/视频)。
- `## 阶段编排` —— 阶段0 消息数据形态确认;阶段1 文本收发+pending+ack(产出:能发收文本);阶段2 已读+历史分页+日期分组;阶段3 媒体消息接入(依赖 06/08);阶段4 实时更新与异常重发。每阶段含「产出:」。
- `## 风险点` —— pending message 被服务端结果覆盖的幂等;ack 与 `newUpdateMessage` 到达顺序;分页游标 afterMsgId/beforeMsgId 边界;媒体消息依赖上传链路(标注依赖 06)。

- [ ] **Step 3: 自检内容**

核对:`SendMessageParams` 字段(conversationId/targetId/content/files/fileId/mediaGroupId)与 `chatPreloadTypes.ts` 一致;`ReadMessageResult` 字段一致;消息类型与状态枚举与 `MessageTableTypes.ts` 一致;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/04_MESSAGING.md
git commit -m "docs(web): 新增消息收发需求(多类型/已读/重发/历史分组)"
```

---

## Task 6: 06_MEDIA_UPLOAD.md(媒体上传)

**Files:**

- Create: `docs/web_nextjs/06_MEDIA_UPLOAD.md`
- 参考源:`docs/requirements/MEDIA_UPLOAD_REQUIREMENTS.md`、`apps/electron_client/src/utils/axios/fileOps/`、`apps/electron_client/src/db/table/UploadTaskTable.ts`、`packages/shared-types/src/lib/db/UploadTaskTableTypes.ts`、`apps/electron_client/src/ipc/api/fileOperationIpc.ts`、`packages/shared-types/src/lib/ipc/ipcCallTypes/fileOperationPreloadTypes.ts`

- [ ] **Step 1: 读参考源,确认上传链路**

读取 `MEDIA_UPLOAD_REQUIREMENTS.md`(方案 B:complete 后服务端直接建消息)、`axios/fileOps/`(分片上传调度)、`UploadTaskTable.ts`/`UploadTaskTableTypes.ts`(本地任务字段)、`fileOperationPreloadTypes.ts`(`SelectFiles`/`ReadLocalFile`/`SaveFile`/`OpenLocalFile`、`FileInfoListItem`)。

- [ ] **Step 2: 写 06_MEDIA_UPLOAD.md(套用统一模板)**

各章节必含:

- `## 背景` —— 桌面端上传由主进程本地调度分片;Web 无主进程、无本地文件路径,需用 File API 重建。引用 `MEDIA_UPLOAD_REQUIREMENTS.md` 方案 B。
- `## 当前桌面端实现` —— 端点 `/upload/init`→`/upload/chunk`→`/upload/status`→`/upload/complete`;本地 `upload_task` 表记录 filePath/hash/conversationId/进度/chunk 进度/错误;调度器支持并发与断线恢复;complete 后服务端建 File/Media/MessageHistory 并推 `newUpdateMessage`/`sendFileUploadComplete`;文件选择 `SelectFiles`、读取 `ReadLocalFile`、`FileInfoListItem`(filePath/fileName/fileSize/fileType/mimeType/metadata)。
- `## Web 端目标` —— 复刻分片上传、秒传、断点续传、进度、失败重试;文件来源 File API;本地任务 → IndexedDB;沿用方案 B(客户端不二次发消息)。
- `## 产品需求与验收` —— 小需求:
  - `### 文件选择`:验收 —— `<input type=file>`/拖拽得 File 对象;生成等价 `FileInfoListItem`(无 filePath,用 File/Blob);多选支持。
  - `### 分片上传`:验收 —— File 按 chunkSize 切片;`/upload/chunk` 幂等(已存在 chunk 不重复计数);进度持续可见。
  - `### 秒传`:验收 —— init 命中可复用文件时直接成功态,不进完整 chunk 流程。
  - `### 断点续传`:验收 —— 刷新/断线后用 `/upload/status` 从服务端已落盘分片续传。
  - `### 上传完成建消息`:验收 —— complete 后服务端建消息并推 `newUpdateMessage`,客户端不二次 `sendMessage`;本地 pending 被服务端结果覆盖。
  - `### 失败与重试`:验收 —— 明确失败原因+重试入口。
- `## Web 适配要点` —— `SelectFiles`/`ReadLocalFile`(本地路径)→ File API/Blob;`upload_task` 表 → IndexedDB 任务 store(以 clientMsgId/uploadSessionId/conversationId 关联);并发分片用浏览器 fetch/Axios;关闭标签页恢复用 IndexedDB 任务态。
- `## 任务拆分` —— 客户端(`- [ ]`):File 选择与 FileInfo 组装;分片切割与并发上传;init/chunk/status/complete 调用;秒传分支;IndexedDB 任务表与恢复;进度与失败重试 UI;去掉二次发消息逻辑(对齐方案 B)。
- `## 阶段编排` —— 阶段0 上传/消息/媒体职责边界确认(对齐方案 B);阶段1 File 选择+分片+init/chunk(产出:能上传一张图);阶段2 status 续传+complete 建消息;阶段3 秒传;阶段4 任务恢复+失败重试+体验。每阶段含「产出:」。
- `## 风险点` —— File API 无本地路径,断电后无法从磁盘恢复原文件(只能靠服务端已传分片续传,未传完且 File 丢失需重选);chunk/complete/消息幂等需一起做;秒传不能只靠采样 hash;大文件浏览器内存。

- [ ] **Step 3: 自检内容**

核对:端点四件套与 `MEDIA_UPLOAD_REQUIREMENTS.md` 一致;方案 B(不二次发消息)明确;`FileInfoListItem` 字段与 `fileOperationPreloadTypes.ts` 一致;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/06_MEDIA_UPLOAD.md
git commit -m "docs(web): 新增媒体上传需求(File API 分片/秒传/续传/方案B)"
```

---

## Task 7: 08_VOICE_MESSAGE.md(语音消息)

**Files:**

- Create: `docs/web_nextjs/08_VOICE_MESSAGE.md`
- 参考源:`apps/electron_client/src/services/audioService.ts`、`apps/electron_client/src/ipc/api/audioIpc.ts`、`packages/shared-types/src/lib/ipc/ipcCallTypes/audioPreloadTypes.ts`、`packages/audio-core`、`apps/frontend/src/hooks/useAudioRecorder.ts`、`useAudioMessage.ts`、`useWaveformCanvas.ts`、`apps/frontend/src/stores/audioPlayerStore.ts`、`apps/frontend/src/components/AudioPlayerBridge.tsx`、`apps/frontend/src/pages/chats/components/middle/input/RecordingButton.tsx`、`message/types/AudioMessage.tsx`

- [ ] **Step 1: 读参考源,确认音频能力**

读取 `audioPreloadTypes.ts`(`saveVoice({buffer,metadata{duration,waveform,mimeType}})→FileInfoListItem`、`getAudioInfoByLocalPath({filePath})→AudioWaveformInfo`)、`audioService.ts`、`audio-core`、前端 `useAudioRecorder`/`useAudioMessage`/`useWaveformCanvas`、`audioPlayerStore`、`AudioPlayerBridge`、`RecordingButton`、`AudioMessage`。

- [ ] **Step 2: 写 08_VOICE_MESSAGE.md(套用统一模板)**

各章节必含:

- `## 背景` —— 语音消息含录音、波形、播放;桌面端用 Electron 音频+主进程保存,Web 用浏览器音频 API。
- `## 当前桌面端实现` —— IPC:`saveVoice`(buffer+metadata{duration,waveform,mimeType}→FileInfoListItem)、`getAudioInfoByLocalPath`(→AudioWaveformInfo{duration,sampleRate,channels,bitrate,waveform,waveformBase64});`audioService.ts` + `packages/audio-core`;前端 hooks `useAudioRecorder`(录音)、`useWaveformCanvas`(波形绘制)、`useAudioMessage`;播放状态 `audioPlayerStore` + `AudioPlayerBridge`(全局单例播放);录音入口 `RecordingButton`;消息渲染 `AudioMessage`。
- `## Web 端目标` —— 复刻录音、波形生成与展示、语音消息发送与全局播放;音频采集与编码改用浏览器 API。
- `## 产品需求与验收` —— 小需求:
  - `### 录音`:验收 —— `RecordingButton` 按住/点击录音(MediaRecorder),显示时长;取消/发送两种结束;权限被拒有提示。
  - `### 波形生成`:验收 —— 录音后用 Web Audio API 解码生成 waveform 与 duration(对应桌面端 metadata);发送时随媒体提交。
  - `### 语音消息发送`:验收 —— 录音 Blob 走上传链路(见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md))得 fileId/url,作为语音消息发送(见 [04_MESSAGING.md](04_MESSAGING.md))。
  - `### 语音播放`:验收 —— `AudioMessage` 点击播放;全局单例只播一条(`audioPlayerStore`),切换自动停上一条;波形随播放进度。
- `## Web 适配要点` —— Electron 音频采集 → MediaRecorder;`saveVoice`(主进程保存)→ 浏览器侧生成 metadata 后随上传链路提交;`getAudioInfoByLocalPath`(本地路径)→ 浏览器 decodeAudioData;`AudioPlayerBridge` 全局播放逻辑可大体复用。
- `## 任务拆分` —— 客户端(`- [ ]`):MediaRecorder 录音 hook;Web Audio 波形+时长生成;录音 Blob 接上传链路;语音消息发送;全局单例播放;波形进度联动。
- `## 阶段编排` —— 阶段0 音频数据形态确认(duration/waveform/mimeType);阶段1 录音+波形(产出:能录一段并看波形);阶段2 发送(依赖 06);阶段3 全局播放与进度。每阶段含「产出:」。
- `## 风险点` —— 浏览器录音格式(webm/opus)与服务端/对端兼容;麦克风权限;MediaRecorder 跨浏览器差异;波形生成性能;依赖上传链路(标注依赖 06)。

- [ ] **Step 3: 自检内容**

核对:`saveVoice`/`getAudioInfoByLocalPath` 签名与 `audioPreloadTypes.ts` 一致;metadata 字段(duration/waveform/mimeType)一致;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/08_VOICE_MESSAGE.md
git commit -m "docs(web): 新增语音消息需求(MediaRecorder 录音/波形/播放)"
```

---

## Task 8: 07_MEDIA_PREVIEW.md(媒体预览)

**Files:**

- Create: `docs/web_nextjs/07_MEDIA_PREVIEW.md`
- 参考源:`docs/requirements/MEDIA_PREVIEW_REQUIREMENTS.md`、`apps/electron_client/src/main/windows/mediaPreviewWindow.ts`、`apps/electron_client/src/ipc/api/mediaPreviewIpc.ts`、`packages/shared-types/src/lib/ipc/webContentEvent.ts`(`MediaPreviewPayload`)、`apps/frontend/src/pages/chats/components/middle/message/types/ImageGroup.tsx`、`VideoMessage.tsx`、`apps/media_preview`(若存在)

- [ ] **Step 1: 读参考源,确认预览协议**

读取 `MEDIA_PREVIEW_REQUIREMENTS.md`(`PreviewMediaItem`/`OpenMediaPreviewParams`、图片/视频验收、快捷键)、`mediaPreviewWindow.ts`(窗口管理)、`mediaPreviewIpc.ts`(`OpenMediaPreview`/`GetMediaPreviewPayload`)、`ImageGroup.tsx`/`VideoMessage.tsx` 触发点。

- [ ] **Step 2: 写 07_MEDIA_PREVIEW.md(套用统一模板)**

各章节必含:

- `## 背景` —— 桌面端用独立 Electron 窗口做沉浸预览;Web 无独立窗口,用应用内 Lightbox/路由弹层。
- `## 当前桌面端实现` —— IPC:`OpenMediaPreview(payload)`、`GetMediaPreviewPayload()`;`MediaPreviewPayload`/`PreviewMediaItem`(id/type/url/fileUrl/filePath/mimeType/fileName/...);独立窗口 `mediaPreviewWindow.ts` 单例复用;独立项目 `apps/media_preview`(深色沉浸 UI、图片缩放/旋转/切换、视频播放、快捷键);触发点 `ImageGroup`(组装 items+index)、`VideoMessage`(改外链为预览)。
- `## Web 端目标` —— 复刻图片/视频预览交互(缩放/拖拽/旋转/切换/播放控制/快捷键);形态从独立窗口 → 应用内 Lightbox。
- `## 产品需求与验收` —— 小需求:
  - `### 图片预览`:验收 —— 点击缩略图打开 Lightbox 显示原图;图片组按当前索引进入,可上一张/下一张;滚轮缩放、拖拽、双击还原、旋转;快捷键 Esc 关、←→ 切、+/- 缩放、0 还原;加载失败可重试。
  - `### 视频预览`:验收 —— 点击进入 Lightbox 播放(不外链);播放/暂停、进度、音量、静音、倍速;显示文件名/时长/当前时间;Space 播放暂停、←→ 快退快进、Esc 关。
  - `### 预览容器体验`:验收 —— 深色沉浸背景、内容居中、操作栏弱化可发现;关闭释放 object URL 并停播;缩放比例限制(如 0.2x–5x)。
  - `### 本地与远端资源`:验收 —— 有 `fileUrl` 用远端;无则用 File/Blob object URL(Web 无本地路径,不走 `ReadLocalFile`);切换/卸载释放 URL。
- `## Web 适配要点` —— 独立窗口 → 应用内 Lightbox 组件或并行路由;`OpenMediaPreview` IPC → 前端状态/路由触发;窗口复用语义在 Web 无意义(同页单 Lightbox);`filePath`+`ReadLocalFile` → File/Blob object URL。
- `## 任务拆分` —— 客户端(`- [ ]`):Lightbox 容器(深色/居中/操作栏);图片查看器(缩放/拖拽/旋转/切换/快捷键/重试);视频播放器(控制/快捷键);资源解析(fileUrl/object URL)与释放;`ImageGroup`/`VideoMessage` 触发接入。
- `## 阶段编排` —— 阶段0 预览数据结构确认(PreviewMediaItem Web 子集);阶段1 Lightbox 容器+图片(产出:能看大图并切换);阶段2 视频播放;阶段3 快捷键+资源释放+体验。每阶段含「产出:」。
- `## 风险点` —— 远端视频需服务端支持 Range 才好拖进度;大图内存与卡顿;object URL 泄漏;跨消息图片组上下文(沿用桌面端同组聚合限制)。

- [ ] **Step 3: 自检内容**

核对:`PreviewMediaItem`/`OpenMediaPreviewParams` 字段与 `MEDIA_PREVIEW_REQUIREMENTS.md`/`webContentEvent.ts` 一致;显式标注无独立窗口、无窗口复用语义;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/07_MEDIA_PREVIEW.md
git commit -m "docs(web): 新增媒体预览需求(独立窗口→应用内 Lightbox)"
```

---

## Task 9: 05_GROUP_CHAT.md(群聊)

**Files:**

- Create: `docs/web_nextjs/05_GROUP_CHAT.md`
- 参考源:`docs/requirements/GROUP_CHAT_REQUIREMENTS.md`、`packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`(群聊方法)、`apps/frontend/src/pages/chats/components/middle/GroupDetailDialog.tsx`、`new-chat.tsx`、`components/group-name.ts`、`chat-avatar-style.ts`

- [ ] **Step 1: 读参考源,确认群聊方法与 UI**

读取 `GROUP_CHAT_REQUIREMENTS.md`(全文,作为复刻基准)、`chatPreloadTypes.ts`(`CreateGroup`/`GetGroupDetail`/`UpdateGroup`/`InviteGroupMembers`/`LeaveGroup`/`DismissGroup`、相关 Params)、`GroupDetailDialog.tsx`、`new-chat.tsx`(创建群入口/选人)。

- [ ] **Step 2: 写 05_GROUP_CHAT.md(套用统一模板,定位为「Web 差异说明」)**

本文档不重复后端逻辑,以「对照 + Web 差异」为主:

- `## 背景` —— 群聊后端与桌面端已实现(见 `docs/requirements/GROUP_CHAT_REQUIREMENTS.md`);本文档只规划 Web 端复刻的差异部分。
- `## 当前桌面端实现` —— IPC:`CreateGroup({name?,memberIds,avatarUrl?})→LocalConversationListItem`、`GetGroupDetail({groupId})→IGetGroupDetailResponse`、`UpdateGroup({groupId,name?,avatarUrl?,notice?})`、`InviteGroupMembers({groupId,memberIds})`、`LeaveGroup({groupId})`、`DismissGroup({groupId})`;UI:`GroupDetailDialog.tsx`(群资料/成员/编辑/退出/解散)、`new-chat.tsx`(创建群+选人);其余完整需求引用 `GROUP_CHAT_REQUIREMENTS.md`。
- `## Web 端目标` —— 一比一复刻创建群、群会话展示、群消息、群资料、成员管理;后端不变,仅前端调用与 UI 适配 Web。
- `## 产品需求与验收` —— 直接对照 GROUP_CHAT 的产品需求(创建群聊/群会话列表/群消息/群资料/成员管理),每条给 Web 验收:
  - `### 创建群聊`:验收 —— 复用用户搜索选 ≥2 成员、群名可空(服务端默认名);创建成功 upsert 会话并选中。
  - `### 群会话展示`:验收 —— type=2 显示群名/群头像,空头像用群名首字 fallback(`group-name.ts`/`chat-avatar-style.ts`);"群组" folder 仅群聊。
  - `### 群消息`:验收 —— 复用消息链路(见 [04_MESSAGING.md](04_MESSAGING.md));非成员/退出/被移除不可发。
  - `### 群资料`:验收 —— 展示群名/头像/公告/群主/成员列表;群主可编辑;普通成员只读。
  - `### 成员管理`:验收 —— 群主邀请成员、解散群;普通成员退出群;退出/解散后会话列表同步。
- `## Web 适配要点` —— 群聊 IPC → browser service(签名一致);`GroupDetailDialog`/`new-chat` 复用前端组件;头像上传走 06 链路;成员选择复用 `GetUserList`。
- `## 任务拆分` —— 客户端(`- [ ]`):创建群入口+成员选择+群名;群会话展示+fallback;群详情弹窗(资料/成员/编辑/邀请/退出/解散);退出/解散后会话同步。服务端:无(复用现有)。
- `## 阶段编排` —— 阶段0 复用群聊 IPC 签名确认;阶段1 创建群+进入聊天(产出:能建群发消息);阶段2 群资料+成员管理;阶段3 退出/解散同步+体验。每阶段含「产出:」。
- `## 风险点` —— 与 `GROUP_CHAT_REQUIREMENTS.md` 风险点一致(targetInfo 复用、未读按参与者维度、退出/解散同步);Web 头像上传依赖 06。

- [ ] **Step 3: 自检内容**

核对:6 个群聊 IPC 方法签名与 `chatPreloadTypes.ts` 一致;明确"后端复用、只做前端差异";引用 `GROUP_CHAT_REQUIREMENTS.md` 而非重写;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/05_GROUP_CHAT.md
git commit -m "docs(web): 新增群聊 web 复刻差异需求"
```

---

## Task 10: 09_DESKTOP_CAPABILITY_MAP.md(桌面能力 Web 取舍)

**Files:**

- Create: `docs/web_nextjs/09_DESKTOP_CAPABILITY_MAP.md`
- 参考源:`apps/electron_client/src/main/windows/windowManager.ts`、`main/tray/trayManager.ts`、`components/system/TitleBar.tsx`、`CloseAppBtn.tsx`、`db/DatabaseManager.ts`、`ipc/api/fileOperationIpc.ts`、`main/windows/mediaPreviewWindow.ts`、`services/audioService.ts`

- [ ] **Step 1: 读参考源,确认桌面能力实现**

复核 9 项桌面能力的真实实现位置(与 spec 映射表对齐)。

- [ ] **Step 2: 写 09_DESKTOP_CAPABILITY_MAP.md(说明性,专属结构)**

结构:

- `## 目的` —— 集中说明桌面专有能力在 Web 端的取舍,供各模块文档引用,避免重复。
- `## 能力总表` —— 复制 spec 的 9 行映射表(桌面端能力 / 实现位置 / Web 等价方案 / 结论)。
- `## 逐项说明` —— 每项一个 `### 小节`,含:桌面端实现(真实文件)、Web 等价方案、结论(复刻/等价替代/不复刻)、理由、影响面、一期取舍。逐项覆盖:
  - `### IPC → 主进程` → browser service 直连(等价替代)。
  - `### Protobuf over Socket.IO` → 浏览器复用 protoMap(复刻)。
  - `### 本地 SQLite` → IndexedDB(等价替代,异步事务差异)。
  - `### 独立媒体预览窗口` → 应用内 Lightbox(等价替代,无独立窗口)。
  - `### 多窗口多账号` → 单标签单账号(一期不复刻,理由:浏览器无多窗口账号隔离的等价、复杂度高)。
  - `### 系统托盘` → 不复刻(浏览器无等价)。
  - `### 自定义标题栏/窗口控制` → 不复刻(浏览器原生窗口)。
  - `### 文件选择/本地路径` → File API/Blob(等价替代,无本地路径,影响上传与预览)。
  - `### Electron 音频` → MediaRecorder/Web Audio(等价替代,格式兼容风险)。
- `## 对模块的影响索引` —— 列出每项影响到哪些模块文档(如 SQLite→02/03/04/06、文件路径→01头像/06/07、音频→08)。

- [ ] **Step 3: 自检内容**

核对:9 项逐项齐全且结论与 spec 映射表完全一致;每项含理由+影响面+一期取舍;无占位符。

- [ ] **Step 4: Commit**

```bash
git add docs/web_nextjs/09_DESKTOP_CAPABILITY_MAP.md
git commit -m "docs(web): 新增桌面能力 web 取舍映射说明"
```

---

## Final: 全集自检与计划完成

- [ ] **Step 1: 校验文档集完整性**

Run:

```bash
ls docs/web_nextjs/
```

Expected: 恰好 10 个文件 `00_OVERVIEW.md`–`09_DESKTOP_CAPABILITY_MAP.md`。

- [ ] **Step 2: 扫描占位符**

用 Grep 搜索 `docs/web_nextjs/` 下 `TODO|TBD|待补充|FIXME|占位`。
Expected: 无匹配(`- [ ]` 任务复选框不算占位符)。

- [ ] **Step 3: 校验交叉链接**

核对各文档内 `[..](0x_*.md)` 相对链接目标文件均存在;映射表 9 行在 `00` 与 `09` 一致;开发顺序在 `00` 与 spec 一致(`02→01→03→04→06→08/07→05→09`)。

- [ ] **Step 4: 终检提交(如有链接修正)**

```bash
git add docs/web_nextjs/
git commit -m "docs(web): web 复刻需求文档集交叉链接与一致性校验" || echo "无修正,跳过"
```

---

## 自检(Self-Review,计划编写后已执行)

**1. Spec 覆盖度:** spec 的 10 份文档逐一对应 Task 1–10;模板、能力映射表、开发顺序、非复刻范围(好友/托盘/标题栏/多账号)均有 Task 落点(Task 1 与 Task 10)。无缺口。

**2. 占位符扫描:** 本计划各 Task 的 Step 2 已写明每份文档必含的具体小节与小需求清单,无 `TODO/TBD/待补充`;文档内 `- [ ]` 为任务复选框,非占位符。

**3. 类型/命名一致性:** 全程引用真实命名 —— IPC 方法(`SendMessage`/`ReadMessage`/`CreateGroup` 等)、Socket 事件(`ackSendMessage`/`newUpdateMessage`/`newConversation`)、folder 五值(`all/unread/personal/groups/archive`)、四端点(`/upload/init|chunk|status|complete`)、音频方法(`saveVoice`/`getAudioInfoByLocalPath`)在各 Task 间一致;每个 Task 的 Step 1 强制先读源码核对,防止命名漂移。

**4. 依赖顺序:** Task 顺序 = 开发顺序(02 底座先行;06 上传先于 08 语音/07 预览;05 群聊在后),与 spec 修正后的顺序一致。媒体类文档均标注"依赖 06"。
