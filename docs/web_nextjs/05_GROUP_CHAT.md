# 群聊需求分析与任务编排

## 背景

群聊后端与桌面端已实现(见 `../requirements/GROUP_CHAT_REQUIREMENTS.md`);本文档只规划 Web 端复刻的差异部分,不重复后端逻辑。

## 当前桌面端实现

### 群聊 IPC 方法

来自 `packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`:

**CreateGroup**

```typescript
CreateGroup: IpcMethod<CreateGroupParams, LocalConversationListItem>;

interface CreateGroupParams {
  name?: string;
  memberIds: string[];
  avatarUrl?: string;
}
```

**GetGroupDetail**

```typescript
GetGroupDetail: IpcMethod<GetGroupDetailParams, GetGroupDetailResult>;

interface GetGroupDetailParams {
  groupId: string;
}

type GetGroupDetailResult = IGetGroupDetailResponse;
```

**UpdateGroup**

```typescript
UpdateGroup: IpcMethod<UpdateGroupParams, GroupOperationResult>;

interface UpdateGroupParams {
  groupId: string;
  name?: string;
  avatarUrl?: string;
  notice?: string;
}

type GroupOperationResult = IGroupOperationResponse;
```

**InviteGroupMembers**

```typescript
InviteGroupMembers: IpcMethod<InviteGroupMembersParams, GroupOperationResult>;

interface InviteGroupMembersParams {
  groupId: string;
  memberIds: string[];
}
```

**LeaveGroup**

```typescript
LeaveGroup: IpcMethod<GroupActionParams, GroupOperationResult>;

interface GroupActionParams {
  groupId: string;
}
```

**DismissGroup**

```typescript
DismissGroup: IpcMethod<GroupActionParams, GroupOperationResult>;

interface GroupActionParams {
  groupId: string;
}
```

### 桌面端 UI 位置

- **群详情弹窗**: `apps/frontend/src/pages/chats/components/middle/GroupDetailDialog.tsx` — 展示群资料、成员列表、群主编辑入口、普通成员退出入口、群主解散入口
- **创建群入口**: `apps/frontend/src/pages/chats/components/new-chat.tsx` — 创建群聊 + 成员选择 + 群名输入
- **群名工具**: `apps/frontend/src/pages/chats/components/group-name.ts` — 定义 `MAX_GROUP_NAME_LENGTH = 24`
- **头像样式工具**: `apps/frontend/src/pages/chats/components/chat-avatar-style.ts` — 空头像时使用群名首字 fallback,通过 `getChatAvatarFallbackClass` 生成颜色类

### 完整需求引用

群聊完整产品需求、数据模型、协议设计、服务端实现、客户端本地模型、任务编排、风险点等详见 `../requirements/GROUP_CHAT_REQUIREMENTS.md`。

## Web 端目标

一比一复刻桌面端群聊能力:

- 创建群聊并选择多个成员
- 群会话在会话列表中展示群名称、群头像、最后一条消息、未读数
- 群成员可以发送和接收群消息(文本、图片、文件、语音、视频等现有消息类型)
- 查看群资料和群成员列表
- 群主可以修改群名称、群头像、群公告
- 群主可以邀请新成员
- 普通成员可以退出群聊
- 群主可以解散群聊

后端不变,仅前端调用与 UI 适配 Web。

## 产品需求与验收

### 创建群聊

用户从聊天页进入创建群聊流程,选择至少 2 个其他用户,填写群名称或使用默认群名称。

验收标准:

- 复用用户搜索能力选择成员
- 至少需要选择 2 个其他用户(加上创建者共 3 个总成员)
- 群名称为空时,服务端生成默认名称
- 群名称长度限制为 `MAX_GROUP_NAME_LENGTH = 24`
- 创建成功后当前用户自动进入群聊会话,会话列表 upsert 该群聊并选中

### 群会话展示

群聊在会话列表中展示为独立会话。

验收标准:

- `Conversation.type = 2` 的会话展示群名称和群头像
- "群组" folder 只展示 `type === 2` 的会话
- 空群头像时使用群名首字作为 fallback,通过 `getChatAvatarFallbackClass` 生成颜色类
- 群消息到达后,会话自动置顶到列表前部
- 未读数按用户单独统计

### 群消息

群成员可以在群聊中发送消息。

验收标准:

- 文本、图片、文件、语音、视频消息复用现有发送链路(见 [04_MESSAGING.md](04_MESSAGING.md))
- 非群成员不能发送消息
- 退出群聊或被移除成员不能继续发送消息
- 消息推送给群内所有在线成员
- 发送者本人本地消息状态能从 sending 更新到 success 或 fail
- 群消息历史拉取复用现有逻辑

### 群资料

用户可以查看群资料。

验收标准:

- 展示群名称、群头像、群公告、群主、创建时间
- 展示群成员列表,至少包含头像、昵称、角色
- 群主可以编辑群名称、头像、公告
- 普通成员不能编辑群资料,只能查看

### 成员管理

一期只做轻量成员管理。

验收标准:

- 群主可以邀请新成员
- 普通成员可以主动退出群聊
- 群主可以解散群聊
- 退出群聊后,会话从列表移除或标记不可用
- 解散群聊后,所有成员无法继续发送消息,会话列表同步

## Web 适配要点

### 调用层适配

- 桌面端群聊 IPC 方法(`CreateGroup`、`GetGroupDetail`、`UpdateGroup`、`InviteGroupMembers`、`LeaveGroup`、`DismissGroup`) → Web 端 browser service 方法
- 方法签名保持一致,入参和返回值类型复用 `shared-types`
- 调用方式从 `ipc.CreateGroup(params)` 改为 `browserService.createGroup(params)`

### UI 组件复用

- 桌面端 `GroupDetailDialog.tsx` 和 `new-chat.tsx` 的 UI 结构和交互逻辑可直接复用到 Web 端
- 成员选择复用 `GetUserList` 能力
- 群名工具 `group-name.ts` 和头像样式工具 `chat-avatar-style.ts` 可直接复用

### 头像上传

- 群头像上传走 Web 端媒体上传链路(见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md))
- 上传完成后获取 `avatarUrl`,传给 `CreateGroup` 或 `UpdateGroup`

### 会话列表同步

- 创建群成功后,通过 `newUpdateMessage` 推送会话更新,Web 端本地会话列表 upsert
- 退出群或解散群后,通过 `newUpdateMessage` 推送会话状态更新,Web 端本地会话列表同步

## 任务拆分

### 客户端任务

- [ ] 实现 Web 端 browser service 群聊方法(`createGroup`、`getGroupDetail`、`updateGroup`、`inviteGroupMembers`、`leaveGroup`、`dismissGroup`),签名与 IPC 方法一致
- [ ] 实现创建群聊入口,复用成员选择组件,支持群名输入
- [ ] 创建成功后 upsert 会话列表并选中该群聊
- [ ] 实现群会话展示,`type === 2` 显示群名和群头像,空头像使用群名首字 fallback
- [ ] "群组" folder 只展示 `type === 2` 的会话
- [ ] 实现群详情弹窗或侧栏,展示群资料和成员列表
- [ ] 群主可编辑群名称、头像、公告
- [ ] 群主可邀请新成员
- [ ] 普通成员可退出群聊
- [ ] 群主可解散群聊
- [ ] 处理退出/解散后的会话列表同步
- [ ] 补充 loading、empty、error 状态

### 服务端任务

无(复用现有群聊后端实现)。

## 阶段编排

### 阶段 0:复用群聊 IPC 签名确认

目标:确认 Web 端 browser service 方法签名与桌面端 IPC 方法一致。

- [ ] 确认 `CreateGroup`、`GetGroupDetail`、`UpdateGroup`、`InviteGroupMembers`、`LeaveGroup`、`DismissGroup` 方法签名
- [ ] 确认入参和返回值类型复用 `shared-types`

产出:

- Web 端 browser service 方法签名与桌面端 IPC 方法一致

### 阶段 1:创建群 + 进入聊天

目标:用户能在 Web 端创建群并进入聊天。

- [ ] 实现 Web 端 `createGroup` 方法
- [ ] 实现创建群聊入口,复用成员选择组件
- [ ] 实现群名输入,长度限制 `MAX_GROUP_NAME_LENGTH = 24`
- [ ] 创建成功后 upsert 会话列表并选中
- [ ] 验证群聊消息发送

产出:

- 用户可通过 Web UI 创建群聊并发送第一条消息

### 阶段 2:群资料 + 成员管理

目标:群聊具备基本管理能力。

- [ ] 实现 Web 端 `getGroupDetail`、`updateGroup`、`inviteGroupMembers`、`leaveGroup`、`dismissGroup` 方法
- [ ] 实现群详情弹窗或侧栏
- [ ] 展示群资料和成员列表
- [ ] 群主可编辑群名称、头像、公告
- [ ] 群主可邀请成员
- [ ] 普通成员可退出群聊
- [ ] 群主可解散群聊

产出:

- 群聊一期开箱可用

### 阶段 3:退出/解散同步 + 体验

目标:补齐边界体验和异常处理。

- [ ] 处理退出/解散后的会话列表同步
- [ ] 完善 loading、empty、error 状态
- [ ] 处理重复创建、成员为空、成员不存在等异常
- [ ] 统一群消息最后一条文案,例如 `[图片]`、`[文件]`
- [ ] 补充 README 或开发说明

产出:

- 功能稳定,异常路径清晰

## 风险点

与 `../requirements/GROUP_CHAT_REQUIREMENTS.md` 风险点一致:

- `ConversationInfo.targetInfo` 当前只适合一个目标对象,群聊可以复用为群资料摘要,但成员详情需要单独接口
- 服务端 `getUserConversations` 目前私聊和群聊 targetInfo 组装逻辑不同,需要避免 N+1 查询
- 群消息未读数需要按 `ConversationParticipant` 维度维护,不能只靠客户端自增
- 退出群和解散群需要同步会话列表,否则客户端会出现"已不可用会话仍可发送"的问题
- 本地 SQLite 如果暂不缓存群资料,离线打开群详情会受限(Web 端无 SQLite,依赖服务端实时查询)

Web 端特有风险:

- 群头像上传依赖 Web 端媒体上传链路(见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)),需确保上传完成后再调用 `CreateGroup` 或 `UpdateGroup`
- Web 端无本地 SQLite 缓存,群资料和成员列表完全依赖服务端实时查询,网络异常时体验受限
