# 群聊需求分析与任务编排

## 背景

当前项目已经具备私聊、会话列表、消息历史、文件消息、本地缓存和实时推送能力。服务端 Prisma 模型中也已经存在 `Group`、`GroupMember`、`Conversation(type=2)`、`ConversationParticipant` 等群聊基础模型，但群聊还没有形成完整产品闭环。

本文件用于记录群聊一期需求范围、技术拆解和任务编排，方便后续按阶段开发。

## 当前基础

### 已具备

- 数据模型已有群组基础表：`Group`、`GroupMember`。
- 会话模型已经支持 `type = 1` 私聊、`type = 2` 群聊。
- 会话参与者表 `ConversationParticipant` 可以承载群成员的未读、已读、置顶、免打扰、软删除等个性化状态。
- 服务端 `ChatService` 已有 `getOrCreateGroupConversation(targetId)` 雏形。
- 客户端本地会话模型 `LocalConversationListItem.type` 已可区分私聊和群聊。
- 客户端左侧栏已经支持“全部 / 未读 / 私聊 / 群组 / 归档”筛选。
- 消息收发链路基于 `conversationId`，理论上可以复用到群聊。

### 主要缺口

- 缺少创建群聊、拉取群资料、拉取群成员、更新群资料、邀请成员、退出群聊等协议和接口。
- 服务端会话列表目前主要组装私聊 `targetInfo`，群聊 `targetInfo` 还没有完整使用 `Group` 信息。
- 发送群消息前缺少成员权限校验。
- 新建群后，在线成员加入 Socket 房间的逻辑还不完整。
- 客户端缺少创建群聊入口、选择成员 UI、群详情页、群成员列表和群资料编辑。
- Electron IPC 与 shared protobuf 还没有群聊相关方法定义。
- 本地 SQLite 没有群资料、群成员缓存表；一期可以先不缓存详情，但会影响离线体验。

## 一期目标

一期目标是做一个稳定可用的基础群聊闭环：

- 用户可以创建群聊并选择多个成员。
- 创建成功后所有成员都能在会话列表看到群聊。
- 群成员可以发送和接收群消息。
- 群聊支持文本、图片、文件、语音等现有消息类型。
- 会话列表展示群名称、群头像、最后一条消息、未读数。
- 用户可以查看群资料和群成员列表。
- 群主可以修改群名称、群头像、群公告。
- 普通成员可以退出群聊；群主可以解散群聊。

## 非一期范围

- 群管理员体系的完整权限设计。
- 群邀请审批、入群申请、群二维码。
- 群禁言、单成员禁言。
- @成员、@所有人。
- 群成员搜索、群公告已读回执。
- 群消息已读人数。
- 群头像自动九宫格生成。
- 大规模群性能优化。

## 产品需求

### 创建群聊

用户从聊天页或联系人页进入创建群聊流程，选择至少 2 个其他用户，填写群名称或使用默认群名称。

验收标准：

- 创建群时必须包含当前用户。
- 至少需要 3 个总成员，包含创建者。
- 群名称为空时，服务端生成默认名称。
- 创建成功后当前用户自动进入群聊会话。
- 其他在线成员收到新会话推送。

### 群会话列表

群聊在会话列表中展示为独立会话。

验收标准：

- `Conversation.type = 2` 的会话展示群名称和群头像。
- “群组” folder 只展示群聊。
- 群消息到达后，会话自动置顶到列表前部。
- 未读数按用户单独统计。

### 群消息

群成员可以在群聊中发送消息。

验收标准：

- 文本、图片、文件、语音、视频消息复用现有发送链路。
- 非群成员不能发送消息。
- 退出群聊或被移除成员不能继续发送消息。
- 消息推送给群内所有在线成员。
- 发送者本人本地消息状态能从 sending 更新到 success 或 fail。

### 群资料

用户可以查看群资料。

验收标准：

- 展示群名称、群头像、群公告、群主、创建时间。
- 展示群成员列表，至少包含头像、昵称、角色。
- 群主可以编辑群名称、头像、公告。
- 普通成员不能编辑群资料。

### 成员管理

一期只做轻量成员管理。

验收标准：

- 群主可以邀请新成员。
- 普通成员可以主动退出群聊。
- 群主可以解散群聊。
- 群主退出前需要先转让群主或直接解散，一期建议只支持解散。

## 数据模型建议

当前 Prisma 模型已经覆盖一期主干，建议补充或确认以下约束：

- `Group.state`：`0` 正常，`-1` 解散。
- `GroupMember.state`：`0` 正常，`-1` 退出或被移除。
- `GroupMember.role`：`0` 群主，`1` 管理员，`2` 普通成员。
- `Conversation.type = 2` 时，`targetId` 存储 `Group.id`。
- `ConversationParticipant` 中群成员一人一条记录，承载未读数、已读位置、置顶、免打扰。

建议新增索引：

```prisma
model GroupMember {
  @@index([groupId, state])
  @@index([userId, state])
}

model ConversationParticipant {
  @@index([userId, isDeleted])
  @@index([conversationId, isDeleted])
}
```

## 协议设计

需要在 `packages/shared-protobuf/src/static/Chat.proto` 和服务端 `src/proto` 同步增加群聊协议。

建议新增消息：

```proto
message CreateGroupRequest {
  string name = 1;
  repeated string member_ids = 2;
  optional string avatar_url = 3;
}

message CreateGroupResponse {
  GroupInfo group = 1;
  ConversationInfo conversation = 2;
}

message GetGroupDetailRequest {
  string group_id = 1;
}

message GroupMemberInfo {
  string user_id = 1;
  string nickname = 2;
  optional string avatar_url = 3;
  int32 role = 4;
  optional string alias = 5;
  int32 state = 6;
}

message GetGroupDetailResponse {
  GroupInfo group = 1;
  repeated GroupMemberInfo members = 2;
}

message UpdateGroupRequest {
  string group_id = 1;
  optional string name = 2;
  optional string avatar_url = 3;
  optional string notice = 4;
}

message InviteGroupMembersRequest {
  string group_id = 1;
  repeated string member_ids = 2;
}

message LeaveGroupRequest {
  string group_id = 1;
}

message DismissGroupRequest {
  string group_id = 1;
}
```

需要在 `protoMap.ts` 中补充客户端事件和服务端响应事件。

## 服务端任务

### S1. 群组领域服务

- 新增 `GroupService` 或在 `ChatService` 中拆出群组相关方法。
- 实现 `createGroup(ownerId, name, memberIds, avatarUrl?)`。
- 事务内创建 `Group`、`GroupMember`、`Conversation(type=2)`、`ConversationParticipant`。
- 校验成员存在、去重、自动加入创建者。
- 创建成功后返回 `GroupInfo` 和 `ConversationInfo`。

### S2. 群会话列表

- 修改 `ChatService.getUserConversations`。
- 对 `type=2` 的会话批量查询 `Group`。
- 群聊 `targetInfo` 使用 `Group.id`、`Group.name`、`Group.avatarUrl`。
- 过滤已解散群组或已退出成员。
- 确认分页、未读数、最后消息排序不被破坏。

### S3. 群消息权限

- 在 `MessageHandler.handleSendMessage` 或 `MessageService.sendMessage` 前增加权限校验。
- 校验发送者是该会话参与者。
- 如果是群聊，校验 `GroupMember.state = 0` 且 `Group.state = 0`。
- 非成员发送返回失败 ack。

### S4. 群消息推送

- 创建群后，让在线成员加入 `conversationId` 对应 Socket room。
- 邀请新成员后，新成员在线时加入 room。
- 解散或退出后，相关在线用户离开 room 或收到会话状态更新。
- 现有 `newUpdateMessage` 可以继续承载新消息和会话更新。

### S5. 群资料接口

- 实现获取群详情：群基础信息 + 成员列表。
- 实现更新群资料：仅群主可改名称、头像、公告。
- 实现邀请成员：群主可邀请，一期可允许群成员也邀请，但建议先限制群主。
- 实现退出群：更新 `GroupMember.state`、`ConversationParticipant.isDeleted`。
- 实现解散群：更新 `Group.state = -1`，所有参与者 `isDeleted = true`。

### S6. 服务端测试

- 创建群成功。
- 创建群成员去重。
- 非成员无法发群消息。
- 群会话列表正确返回群 `targetInfo`。
- 退出群后不再收到会话。
- 解散群后不能继续发消息。

## 客户端任务

### C1. 共享类型与 IPC

- 更新 `shared-protobuf` 并重新生成 TS 类型。
- 更新 `shared-types` 中 IPC 方法声明。
- 在 Electron `chatIpc` 增加群聊相关 action handler。
- 在 Socket 客户端 request map 中注册新增事件。

### C2. 本地模型

- 确认 `LocalConversationListItem` 已满足群会话列表展示。
- 一期可以只缓存群会话，不缓存群成员详情。
- 若要支持离线查看群资料，新增本地表：
  - `groups`
  - `group_members`

### C3. 创建群聊 UI

- 在聊天页新建会话入口中增加“创建群聊”。
- 复用用户搜索能力选择成员。
- 增加群名称输入，可选群头像。
- 创建成功后写入/更新会话列表，并选中该群聊。

### C4. 群会话展示

- 会话列表展示群名称、群头像。
- 群聊消息顶部标题展示群名。
- 左侧 folder “群组”展示 `type === 2` 的会话。
- 空群头像时使用群名首字作为 fallback。

### C5. 群资料侧栏或弹窗

- 在聊天顶部增加群详情入口。
- 展示群公告、群主、成员列表。
- 群主展示编辑入口。
- 普通成员展示退出群聊。
- 群主展示解散群聊。

### C6. 消息收发兼容

- 发送消息时继续使用 `conversationId`。
- 新建群会话后保证 `selectedConversation` 正确。
- 收到 `newUpdateMessage` 中群会话更新时，本地列表正确 upsert。
- 群消息历史拉取复用现有逻辑。

### C7. 前端测试与验证

- 创建群聊后会话列表出现群。
- 发送文本消息后所有在线成员收到。
- 群文件消息发送成功。
- 退出群后会话从列表移除或标记不可用。
- 解散群后成员无法继续发送消息。

## 任务编排

### 阶段 0：协议和模型确认

目标：确定群聊接口边界，避免前后端反复改协议。

- [x] 梳理并确认 `Chat.proto` 新增消息体。
- [x] 更新客户端 `shared-protobuf`。
- [x] 同步服务端 `src/proto`。
- [x] 更新 `protoMap.ts` 的事件映射。
- [x] 明确群聊错误码和 ack 语义。

产出：

- protobuf 可生成。
- 客户端和服务端可以编译通过。

### 阶段 1：服务端基础闭环

目标：服务端可以创建群、返回群会话、发送群消息。

- [x] 实现创建群事务。
- [x] 实现群会话列表 targetInfo 组装。
- [x] 实现群消息权限校验。
- [x] 创建群后在线成员加入 room。
- [x] 实现群详情查询。
- [ ] 补服务端单元测试或集成测试。

产出：

- 通过 Socket 请求可创建群聊。
- 群成员能收到群消息。
- 群会话能出现在列表中。

### 阶段 2：客户端创建群聊

目标：用户能在客户端创建群并进入聊天。

- [x] Electron IPC 增加 `CreateGroup`、`GetGroupDetail`。
- [x] 前端增加创建群聊入口。
- [x] 实现成员选择组件。
- [x] 实现群名称输入和提交。
- [x] 创建成功后 upsert 会话并选中。
- [x] 验证群聊消息发送。

产出：

- 用户可通过 UI 创建群聊并发送第一条消息。

### 阶段 3：群资料和成员管理

目标：群聊具备基本管理能力。

- [x] 实现群详情弹窗或侧栏。
- [x] 展示群资料和成员列表。
- [x] 群主可编辑群名称、头像、公告。
- [x] 群主可邀请成员。
- [x] 普通成员可退出群聊。
- [x] 群主可解散群聊。
- [x] 处理退出/解散后的会话列表同步。

产出：

- 群聊一期开箱可用。

### 阶段 4：体验补齐

目标：补齐边界体验和异常处理。

- [x] 完善 loading、empty、error 状态。
- [x] 处理重复创建、成员为空、成员不存在等异常。
- [x] 处理离线成员上线后的会话同步。
- [x] 统一群消息最后一条文案，例如 `[图片]`、`[文件]`。
- [x] 增加群会话本地缓存一致性检查。
- [x] 补充 README 或开发说明。

产出：

- 功能稳定，异常路径清晰。

开发说明：

- 会话列表会在进入聊天页、窗口回到可见状态、以及页面可见时每 30 秒同步一次，用于补齐离线期间被邀请进群或群资料变更的情况。
- 群消息最后一条文案统一通过 `generateLastMsgContent` 生成，文本保留原内容，图片/视频/文件/音频使用 `[图片]`、`[视频]`、`[文件]`、`[音频]`。
- 获取服务端会话第一页后会执行群会话本地缓存一致性检查，只记录同 ID 群会话摘要差异，不因分页缺失而删除本地记录。
- 群详情和创建群聊入口需要保留 loading、empty、error 状态；服务端返回的异常消息优先透传到 toast。

## 推荐开发顺序

1. 先改协议和服务端创建群接口。
2. 再修服务端群会话列表 targetInfo。
3. 接着做群消息权限和推送。
4. 然后做客户端 IPC 和创建群 UI。
5. 最后做群详情、成员管理和体验打磨。

这个顺序能保证每一步都有可验证结果，也能尽早暴露协议问题。

## 风险点

- `ConversationInfo.targetInfo` 当前只适合一个目标对象，群聊可以复用为群资料摘要，但成员详情需要单独接口。
- 服务端 `getUserConversations` 目前私聊和群聊 targetInfo 组装逻辑不同，需要避免 N+1 查询。
- 群消息未读数需要按 `ConversationParticipant` 维度维护，不能只靠客户端自增。
- 退出群和解散群需要同步会话列表，否则客户端会出现“已不可用会话仍可发送”的问题。
- 本地 SQLite 如果暂不缓存群资料，离线打开群详情会受限。

## 后续二期方向

- @成员、@所有人。
- 群管理员、踢人、禁言。
- 群公告已读。
- 群二维码和邀请链接。
- 群搜索和群成员搜索。
- 群消息已读人数。
- 大群消息推送优化。
