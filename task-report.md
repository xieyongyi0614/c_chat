# Code Review 报告 — apps/web 群聊

## 审查范围

仅当前 git diff：

- 改：`apps/web/app/chats/_components/ChatInput.tsx`、`ChatWindow.tsx`、`apps/web/app/chats/page.tsx`、`apps/web/lib/services/index.ts`
- 新增：`apps/web/lib/services/group.service.ts`、`MemberSelect.tsx`、`CreateGroupDialog.tsx`、`GroupProfileSheet.tsx`、`GroupEditDialog.tsx`、`GroupInviteDialog.tsx`

## 分级问题清单

### BLOCKER

无。

### WARNING

无。

### NIT

- `GroupProfileSheet.tsx`：`GroupEditDialog` / `GroupInviteDialog` 嵌套渲染在父 `DialogContent` 内。Radix Dialog 走 portal，多层模态可叠加，行为正确；如后续交互复杂可考虑提升为同级渲染。不影响合并。

## 重点核对结论

- group.service 6 个方法均走 `getRealtimeClient().genericRequest(ClientToServiceEvent.*, protobuf payload)`，返回类型由 `genericRequest<T>` 推导，无 any/危险强转。
- 落库与 store 同步正确：
  - create：`toLocalConversation` -> `ConversationDB.upsert` + `upsertConversation`。
  - update：响应含 conversation 时同样 upsert。
  - leave/dismiss：`response.success` 时 `ConversationDB.delete` + `removeConversations`；被删会话为当前选中时 `GroupProfileSheet.afterRemoval()` 调 `selectConversation(null)`（store 的 `removeConversations` 不清选中态，故此处补清正确）。
- 群主判定 `group.ownerId === currentUserId`（undefined 时为 false，安全）；非群主仅显示「退出群聊」，无编辑/邀请/解散入口。服务端 `assertGroupOwner` 为真实权限闸门。
- `groupId = conversation.targetId ?? conversation.id ?? conversationId`；服务端群会话 `targetId = conversation.groupId`，与 `getGroupDetail(groupId)` 入参一致。
- 邀请排除已在群成员：`existingMemberIds` -> `MemberSelect.excludeIds`，且过滤空 userId。
- 创建群至少选 2 人（`MIN_MEMBERS=2`，按钮 disabled 与 submit 双重校验）。
- 退出/解散均用 `AlertDialog` 二次确认；会话移除后 `ChatWindow` 以 `removed=!conversation` 禁用 `ChatInput`（输入框与发送按钮均禁用，占位文案切换）。
- 角色映射 0/1/2 与服务端 Prisma `role @default(2) // 0:群主,1:管理员,2:普通成员` 一致。
- 未读不在客户端自增：group.service 全程不触碰 unreadCount。
- 未改 shared-protobuf / shared-types / 服务端；`getRealtimeClient` 取自 web 本地 `lib/api/client.ts`，未在 shared-api 引入 RealtimeClient。
- React：`MemberSelect` 搜索 debounce 300ms，卸载 `clearTimeout` + `disposed` 守卫；异步回调先判 `disposed` 再 setState；提交均 `void submit()` 规避 no-misused-promises。`GroupProfileSheet` 的 load effect 仅依赖 open/groupId（显式 disable exhaustive-deps，符合相邻代码模式）。
- `MemberSelect` 有两处真实复用（创建群、邀请成员），满足抽取条件，非胶水组件。
- `lucide-react`（Plus）由 `@c_chat/ui` 提供且 apps/web 已有现存使用，非新增依赖。
- 无 mock/placeholder/TODO（ChatInput 第 57 行占位注释为既有代码，不在本次 diff）。

## 修复结论

未发现 BLOCKER / WARNING，无需自动修复，未对代码做任何改动。

## 检查命令

- `cd apps/web && pnpm typecheck` — 通过
- `cd apps/web && pnpm eslint --max-warnings=0 app/chats lib/services/group.service.ts` — 通过

## 结论

全部通过。
