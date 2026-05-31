# Code Review 报告 — apps/web 消息收发

审查范围：当前 git diff（apps/web 消息收发）

- 修改：`apps/web/app/chats/page.tsx`、`apps/web/lib/services/message.service.ts`、`apps/web/lib/stores/message.store.ts`
- 新增：`ChatWindow.tsx`、`ChatInput.tsx`、`MessageList.tsx`、`MessageItem.tsx`、`MessageContent.tsx`

## BLOCKER

无。

## WARNING

- `MessageList.tsx:54` `handleScroll` 在每次滚动事件且接近底部时都调用 `onReachBottom()` → 触发 `messageService.readMessage()`，导致已读上报在用户停留底部时被高频重复触发（违反“已读不重复触发”）。
  → 已修复：改为边沿触发，仅在“由非底部进入底部”时调用。
- `ChatWindow.tsx` 初次加载结尾显式调用 `readMessage`，与 `MessageList` 的 `messageCount` effect（消息到位且在底部时上报已读）重复，开会话即发 2 次已读请求。
  → 已修复：移除加载结尾的显式 `readMessage`，统一由 `onReachBottom` 单一入口收口。

## NIT（未改动，行为正确，记录备查）

- `getMessageHistory` 内部已对 `conversationId` 调 `upsertMany`，分页上翻时旧消息其实由该路径进入 store，`ChatWindow.loadOlderMessages` 中的 `prependOlder` 为冗余二次合并；因 `mergeMessages` 按 `id` 去重，结果幂等、无重复、滚动位置由 `pendingPrependHeightRef` 保持，故不影响正确性。
- 排序 `orderTime` 以 `seq`（已确认）/`localTime|createTime`（pending）为准，而 `selectGroupedMessages` 分组以 `createTime|localTime` 为准，二者在正常时间线下单调一致；极端时钟偏移下可能轻微不一致，非本次范围。
- `selectGroupedMessages` 每次返回新数组引用；因 store 仅含 `currentConversationId` 与 `messages`，不会产生渲染循环，可后续用 shallow/memo 优化。
- `sendMessage` 在仅传 `targetId` 时 `conversationId` 为 `''`，`upsertMany('', ...)` 不会进内存列表；当前 UI 始终传 `conversationId`，为既有 service 形态。

## 关键正确性核对（通过）

- pending 替换/去重：`mergeMessages` 以 `clientMsgId`（pending）/`id` 为 key，服务端确认后按 `id` 删除可能残留的 pending 项，最终按 `id` 去重、按 `orderTime` 排序，无乱序/重复。
- 仅当前选中会话入内存：`upsertMany`/`prependOlder` 均校验 `currentConversationId === conversationId`，`newUpdateMessage` 仅把匹配当前会话的消息写入 store，其余只落 IndexedDB。
- 分页游标：以最早消息 `id` 作为 `beforeMsgId` 上翻；`prependOlder` 去重；`hasMoreOlder` 由返回数量 `>= PAGE_SIZE` 收敛；上滑用 `pendingPrependHeightRef` 保持滚动位置。
- 卸载/切会话清理：`ChatWindow` 以 `key={selectedConversationId}` 重挂载；加载 effect 用 `disposed` 标志 + cleanup；`MessageList` 用 ref 跟踪会话切换并重置滚动状态；移除了 page.tsx 旧的 `readTimer`。
- React 规范：`useEffect` 依赖完整；无 render 期写 ref；async 不直接挂事件属性（统一 `void fn()` 包裹）；no-misused-promises 通过。
- 协议边界：均走 `shared-protobuf` 编解码与 realtime client；UI 不直接接触 protobuf；无新依赖、无 mock 假数据（媒体仅只读骨架，符合范围）。
- 类型安全：无 `any`、无危险强转。

## 检查

- 已执行：`cd apps/web && pnpm typecheck`（通过）
- 已执行：`cd apps/web && pnpm eslint --max-warnings=0 app/chats lib/services/message.service.ts lib/stores/message.store.ts`（EXIT=0）

## 结论

全部通过。BLOCKER / WARNING 已修复，typecheck 与 eslint(max-warnings=0) 均通过。
