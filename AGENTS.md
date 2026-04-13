# 💬 即时通讯核心业务流程说明

本文档基于最新的 Prisma Schema 设计，详细描述了系统中**私聊**与**群聊**的核心业务逻辑流转。

## 📋 核心概念定义

- **会话:** 聊天行为发生的载体。无论是私聊还是群聊，在系统中都抽象为一条 `Conversation` 记录。
- **私聊:** 两个用户之间的通信。其 `Conversation` 的 `target_id` 指向对方用户 ID。
- **群聊:** 多个用户之间的通信。其 `Conversation` 的 `target_id` 指向群组 ID。
- **消息:** 具体的聊天内容，归属于某个 `Conversation`。

---

## 🤝 场景一：私聊流程

<!-- **前提条件:** 用户 A 和用户 B 互为好友（或系统允许陌生人发起会话）。 -->

### 1. 发起会话

当用户 A 在联系人列表中点击用户 B 时，系统需要确保 A 和 B 之间存在唯一的会话通道。

**1.1 生成会话 ID:**
为了保证 A 找 B 和 B 找 A 是同一个会话，使用确定性算法生成 ID：

```
ID = md5(sort([A.id, B.id]).join('_'))
```

或者简单的字符串拼接：`private_{sorted_id_1}_{sorted_id_2}`。

**1.2 查找或创建会话:**

- 后端查询 `Conversation` 表，条件为 `id = 生成的ID`。
- **情况 A（会话存在）:** 直接返回该会话信息。
- **情况 B（会话不存在）:**
  - 在 `Conversation` 表创建一条新记录：
    - `id`: 生成的确定性 ID
    - `type`: `1` (私聊)
    - `target_id`: B 的 ID (或者 A 的 ID，取决于约定，通常存对方 ID)
  - 在 `ConversationParticipant` 表创建两条记录（分别给 A 和 B）：
    - 记录 A 的参与状态（`is_deleted: false`）
    - 记录 B 的参与状态（`is_deleted: false`）

### 2. 发送消息

用户 A 在聊天窗口输入文本并发送。

**2.1 客户端请求:** A 的客户端发送 `{ content: "Hello", type: 0, conversationId: "..." }` 给后端。

**2.2 后端处理:**

- **保存消息:** 在 `MessageHistory` 表插入记录：
  - `sender_id`: A 的 ID
  - `conversation_id`: 会话 ID
  - `content`: "Hello"
  - `state`: `0` (正常)
- **更新会话快照:** 更新 `Conversation` 表对应记录：
  - `last_msg_content`: "Hello"
  - `last_msg_time`: 当前时间
  - `update_time`: 当前时间
- **实时推送:** 后端通过 WebSocket 向该 `conversation_id` 下的所有在线参与者（主要是 B）推送新消息。

### 3. 接收与展示

用户 B 收到消息。

**3.1 本地存储:** B 的客户端收到 WebSocket 推送，将消息写入本地 SQLite 的 `MessageHistory` 表。

**3.2 列表更新:** 更新本地 `Conversation` 列表，将该会话置顶（按 `last_msg_time` 排序），并增加未读数。

**3.3 UI 渲染:** 聊天窗口显示新消息气泡。

### 4. 结束/删除会话

用户 A 决定不再查看此聊天，点击"删除会话"。

**4.1 软删除:** 客户端调用后端接口。

**4.2 更新状态:** 后端更新 `ConversationParticipant` 表：

- 条件：`conversation_id = ...` AND `user_id = A.id`
- 动作：设置 `is_deleted = true`。

**4.3 结果:** A 的聊天列表中不再显示该会话，但 `MessageHistory` 依然保留，且 B 的列表不受影响。

---

## 👥 场景二：群聊流程

**前提条件:** 用户 A 创建了一个群，并拉入用户 B 和 C。

### 1. 进入群聊

用户 A 点击群聊入口。

**1.1 获取会话:**

- 查询 `Conversation` 表，条件：`type = 2` (群聊) AND `target_id = 群ID`。
- 如果不存在（首次创建群时），则创建 `Conversation` 记录，`target_id` 指向 `Group.id`。

**1.2 权限校验:** 检查 `GroupMember` 表，确认 A 在该群的状态是否为 `0` (正常)。

### 2. 发送消息

用户 A 发送一条图片消息。

**2.1 客户端请求:** 发送 `{ type: 1 (图片), url: "...", conversationId: "..." }`。

**2.2 后端处理:**

- **保存消息:** 在 `MessageHistory` 表插入记录：
  - `sender_id`: A 的 ID
  - `conversation_id`: 群会话 ID
  - `content`: 图片 URL
- **更新会话快照:** 更新 `Conversation` 表的 `last_msg_content` 为 "[图片]"，更新时间戳。
- **实时推送:** 后端通过 WebSocket 向该 `conversation_id` 下的**所有**在线参与者（B 和 C）推送消息。

### 3. 修改群设置

用户 A（群主）修改群名为"技术交流群"。

**3.1 更新资料:** 后端更新 `Group` 表：

- `name`: "技术交流群"

**3.2 通知成员:**

- 发送一条系统类型的消息到 `MessageHistory`（可选，用于在聊天流显示"A 修改了群名"）。
- 通过 WebSocket 推送 `update_group_info` 事件，让 B 和 C 的客户端更新本地群信息缓存。

### 4. 退出群聊

用户 B 决定退出群聊。

**4.1 更新成员状态:** 后端更新 `GroupMember` 表：

- 条件：`group_id = ...` AND `user_id = B.id`
- 动作：设置 `state = -1` (退出)。

**4.2 清理会话:**

- 可选操作：更新 `ConversationParticipant` 表，设置 B 的 `is_deleted = true`。

**4.3 结果:** B 不再接收该群的新消息，群成员列表更新。

---

## 📊 数据库字段映射速查表

| 业务动作       | 涉及表                    | 关键字段/操作                             |
| -------------- | ------------------------- | ----------------------------------------- |
| **创建私聊**   | `Conversation`            | `type: 1`, `target_id: 对方UserID`        |
| **创建群聊**   | `Conversation`            | `type: 2`, `target_id: 群ID`              |
| **发送消息**   | `MessageHistory`          | `conversation_id`, `sender_id`, `content` |
| **更新列表**   | `Conversation`            | 更新 `last_msg_content`, `last_msg_time`  |
| **个性化设置** | `ConversationParticipant` | `is_top` (置顶), `is_disturb` (免打扰)    |
| **删除会话**   | `ConversationParticipant` | 设置 `is_deleted: true`                   |
| **群成员管理** | `GroupMember`             | `role` (角色), `state` (状态)             |

---

## 💡 开发者注意事项

1. **私聊 ID 一致性:** 务必在后端封装一个工具函数来生成私聊 `conversation_id`，确保无论谁发起，ID 都是固定的。
2. **数据冗余:** `Conversation` 表中的 `last_msg_content` 是冗余字段。在发送消息的事务中，必须同时更新 `MessageHistory` 和 `Conversation` 表，以保证聊天列表展示的实时性。
3. **索引优化:** 查询消息历史时，务必使用 `conversation_id` + `create_time` 的联合索引进行分页查询，以保证性能。
4. **事务处理:** 在发送消息等关键操作中，使用数据库事务保证数据一致性。
5. **实时性:** 利用 WebSocket 实现消息的实时推送，提升用户体验。
6. **安全性:** 在群聊场景中，发送消息前务必校验用户是否为群成员，防止非法消息发送。

---

## 🚀 总结

本设计通过引入 `Conversation` 表统一管理私聊和群聊，解决了传统设计中私聊与群聊处理逻辑不一致的问题。通过合理的数据冗余和索引优化，保证了聊天列表加载和消息历史查询的性能。

这套方案能够很好地支持即时通讯系统的各种核心功能，并为未来的功能扩展提供了良好的架构基础。
