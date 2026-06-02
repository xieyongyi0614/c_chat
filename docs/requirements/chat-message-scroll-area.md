# Chat Message Scroll Area

## 背景

`MessageHistoryList` 同时承担消息数据渲染和滚动容器行为，包含顶部加载旧消息、滚动到底部、会话切换贴底、异步内容高度变化修正等逻辑，组件职责偏重。

## 当前基础

- 聊天消息基础 UI 已集中在 `packages/chat_ui/src/chat/chatMessage` 导出。
- 前端消息页通过 `MessageHistoryList` 渲染 `MessageGroup`，并从 store 获取当前会话、消息分组和消息数量。
- 输入区通过 `chat:scroll-to-bottom` window 事件触发历史列表滚到底部。

## 目标

把消息历史滚动行为封装到 `@c_chat/ui` 的 `chatMessage` 组件内，页面侧只传入消息数量、会话 key、加载状态和加载旧消息方法。

## 产品需求

- 首次进入或切换会话时，消息历史自动滚动到底部。
- 用户接近底部时，新消息和异步高度变化继续保持贴底。
- 用户离开底部后显示滚动到底部按钮。
- 滚动到顶部阈值内时触发加载更早消息。
- 旧消息 prepend 后保持当前阅读位置不跳动。
- 保留 `chat:scroll-to-bottom` 事件触发滚到底部的能力。

## Web 适配要点

- 使用 DOM `scrollTop` 和 `scrollHeight` 保持历史滚动位置。
- 使用 `ResizeObserver` 处理图片、视频等异步内容导致的高度变化。
- 滚动按钮使用已有 shadcn `Button`，视觉语义沿用当前聊天区域样式。

## 任务编排

- 新增 `ChatMessageScrollArea` 到 `packages/chat_ui/src/chat/chatMessage/_components`。
- 从 `packages/chat_ui/src/chat/chatMessage/index.tsx` 导出滚动组件和事件常量。
- 简化 `apps/frontend/src/pages/chats/components/middle/MessageHistoryList.tsx`，移除本地滚动监听和按钮逻辑。
- 执行 diff review、lint、typecheck，并记录结果到 `task-report.md`。

## 风险点

- 滚动逻辑迁移时需要保持旧的短时间贴底窗口，否则媒体加载完成后可能不能继续贴底。
- prepend 旧消息时不能被 ResizeObserver 的高度修正重复处理。
- 当前工作区已有其他消息组件迁移改动，验证结果可能受既有 diff 影响。
