# Task Report: Electron 本地消息临时 seq 冲突

## Review

### BLOCKER

- 无。

### WARNING

- 全量 `pnpm lint`、`pnpm typecheck` 当前被仓库既有 lint/typecheck 问题阻塞，未能作为整仓通过依据。
- 本地 SQLite 回归脚本因 `better-sqlite3` 原生模块 ABI 与当前 Node.js 版本不匹配无法执行：模块为 `NODE_MODULE_VERSION 143`，当前 Node 需要 `137`。

### NIT

- 无。

## 修改文件

- `apps/electron_client/src/db/table/MessageTable.ts`
- `apps/electron_client/src/ipc/api/chatIpc/messageIpc.ts`
- `apps/frontend/src/pages/chats/hooks/useChatsData.ts`
- `apps/frontend/src/stores/chat/messageStore.ts`
- `docs/requirements/electron-local-message-seq.md`

## 关键修改

- 本地未确认消息改用同会话递减负数 `seq`，避免多条失败/发送中消息都写入 `seq = 0` 后触发 `(conversation_id, seq)` 唯一约束。
- 本地 DB 查询服务端最新序号、已存在序号、按服务端序号翻页时，只统计 `seq > 0` 的服务端消息。
- 前端消息身份和历史连续性判断只把 `seq > 0` 视为服务端序号，负数临时序号仅保留本地消息展示语义。

## 检查

- 已执行 `pnpm.cmd exec eslint apps/electron_client/src/db/table/MessageTable.ts apps/electron_client/src/ipc/api/chatIpc/messageIpc.ts apps/frontend/src/stores/chat/messageStore.ts apps/frontend/src/pages/chats/hooks/useChatsData.ts`，通过。
- 已执行 `git diff --check`，通过。
- 已执行 `pnpm.cmd --filter @c_chat/electron_client typecheck`，失败，原因是既有 TS6059 `rootDir` 配置问题把 workspace 包源码纳入 electron_client 编译。
- 已执行 `pnpm.cmd --filter @c_chat/frontend typecheck`，失败，原因是既有 `GroupDetailDialog.tsx` Button props 类型问题和 `packages/chat_ui` 内 `@/lib/utils`、`@/components/*` alias 解析问题。
- 已执行 `pnpm.cmd --filter @c_chat/electron_client lint`，失败，原因是既有 `SmartTableProxy.ts`、`Table.ts`、`ipc/util.ts`、`logger/index.ts` 等文件 lint 问题。
- 已执行 `pnpm.cmd --filter @c_chat/frontend lint`，失败，原因是既有 `useAudioRecorder.ts`、`useWaveformCanvas.ts`、`globalStore.ts` lint 问题。
- 已执行 `pnpm.cmd lint`，失败，原因是既有 `packages/shared-utils` lint 问题。
- 已执行 `pnpm.cmd typecheck`，失败，原因是 `@c_chat/electron_client` 既有 TS6059 `rootDir` 问题。

## 用户需要本地补跑

- 修复或确认既有 lint/typecheck 问题后，执行 `pnpm.cmd lint`。
- 修复或确认既有 lint/typecheck 问题后，执行 `pnpm.cmd typecheck`。
- 若要运行 SQLite 本地回归脚本或 Electron 原生库相关验证，先用当前 Node/Electron 版本重建 `better-sqlite3`。
