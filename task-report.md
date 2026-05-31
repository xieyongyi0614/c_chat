# 任务报告：Web 会话列表 Code Review

## 审查范围

仅当前 git diff：

- `apps/web/app/chats/page.tsx`
- `apps/web/lib/services/conversation.service.ts`
- `apps/web/lib/services/message.service.ts`
- `apps/web/lib/stores/conversation.store.ts`
- `apps/web/app/chats/_components/ConversationItem.tsx`（新增）
- `apps/web/app/chats/_components/ConversationFolders.tsx`（新增）

## 重点核对结论

- 未读以服务端为准：`message.service.ts` 已移除客户端 `unreadCount + 1` 自增，改为 `readMessage` 回包与 `newUpdateMessage` 推送的 `conversations` 全量回写。通过。
- store upsert 去重 + 降序：`mergeById` 用 `Map` 按 `id` 去重，`sortByUpdateTimeDesc` 按 `updateTime` 降序。通过。
- 推送 handler 在 client 为 null 时短路：`newConversation`、`newUpdateMessage` 均已加 `if (!getRealtimeClient()) return`。通过。
- 过期回包登录用户校验：`getConversationList` 在请求前后比对 `useUserStore.getState().userInfo?.id`，变更则丢弃回包。通过。
- 防抖 readMessage 卸载清理：原 diff 缺失，已修复（见 WARNING）。
- 无新依赖：未引入任何新依赖。通过。
- websocket/protobuf 类型安全：`ReadMessageResponse`（`conversationId: string`、`unreadCount: number`、`msgSeq?: string|null`）、`NewUpdateMessage`（`conversations`、`removedConversationIds`）、`protoMap` 类型映射均匹配，无 `any` / 危险强转。通过。

## 问题清单

### BLOCKER

无。

### WARNING

- `apps/web/app/chats/page.tsx:106` 防抖 `readTimer` 仅在 `handleSelect` 内重置，组件卸载时未清理挂起定时器，违反任务要求的「卸载清理」。已修复：新增空依赖 cleanup effect，卸载时 `clearTimeout(readTimer.current)`。

### NIT

- `apps/web/lib/services/message.service.ts:241` `removedConversationIds` 删除会话时未级联清理 `MessageDB`（存在 `deleteByConversation`），会留下孤儿消息。本次维持既有行为，未改动，避免扩大范围。

## 修复

- 在 `page.tsx` 主 effect 之后新增独立卸载清理 effect，清除挂起的 `readMessage` 防抖定时器。

## 验证

- `cd apps/web && pnpm typecheck`：通过。
- `cd apps/web && pnpm lint`：通过。

## 结论

全部通过，无 BLOCKER / WARNING 未决项。
