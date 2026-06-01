# Web Auth Session Cache

## 背景

Web 端在 IndexedDB 中分别保存 `accessToken` 和 `userInfo`，刷新页面后 zustand 内存态丢失，`/chats` 只判断内存登录态，导致 IndexedDB 中已有 token 时仍跳转到手动登录页。

## 当前基础

- Web 端使用 Dexie `store` 表保存 key/value。
- HTTP 与 Realtime tokenProvider 从 IndexedDB 读取 token。
- `useUserStore` 只保存在内存中，刷新页面后需要从 IndexedDB 恢复。

## 目标

- `accessToken` 和 `userInfo` 直接使用 `localStorage` 保存。
- IndexedDB 不再保存 Web 认证态，只保留会话、消息、上传任务等业务缓存。
- 浏览器刷新或直接进入 `/chats`、`/auth/signin` 时，有有效 token 则自动恢复登录态。

## 产品需求

- 登录/注册成功后自动保存 `accessToken` 和 `userInfo` 到 `localStorage`。
- 旧版 IndexedDB `accessToken` / `userInfo` 缓存可自动迁移到 `localStorage`。
- session 可用时自动进入聊天页，不要求用户重复手动登录。
- 退出登录或 401 时清理新旧认证缓存。

## Web 适配要点

- `apps/web/lib/api/client.ts` 的 HTTP 和 Realtime tokenProvider 从 `localStorage.accessToken` 读取 token。
- `apps/web/lib/services/authSession.storage.ts` 统一封装 `localStorage` 认证态读写。
- `apps/web/lib/services/auth.service.ts` 统一负责 session 保存、迁移、清理和自动登录。
- `apps/web/app/chats/page.tsx` 在内存未认证时先尝试 `localStorage` session 恢复，再决定是否跳登录页。
- `apps/web/app/auth/signin/page.tsx` 进入登录页时也尝试自动恢复 session。

## 任务编排

- 将认证缓存从 IndexedDB 切换到 `localStorage`。
- 更新登录、注册、自动登录、用户信息更新和退出登录流程。
- 更新 tokenProvider 与页面认证恢复逻辑。
- 执行 web lint/typecheck 和根检查，记录既有失败项。

## 风险点

- 旧缓存 JSON 损坏时仍会恢复失败并进入登录页。
- token 过期时会由接口 401 清理缓存并跳转登录页。
- 根目录检查当前仍受既有 `shared-utils` lint 与 `electron_client` typecheck 问题影响。
