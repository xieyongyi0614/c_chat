# Task Report — 07 Media Preview (Web)

任务来源：`docs/web_nextjs/07_MEDIA_PREVIEW.md`
分支：`feat/corner/next`
角色：Review Agent（仅审查 git diff，不做功能开发）

## 改动概述

为 Web 端聊天图片/视频消息接入全屏媒体预览（Lightbox），复用 Electron 端 `MediaPreviewItem` / `MediaPreviewPayload` 协议类型。

新增：
- `apps/web/lib/media/formatFileUrl.ts` — 相对地址补全服务端 base，跳过 http/data/blob
- `apps/web/lib/media/previewItems.ts` — 消息列表 → 预览项映射、按会话构建预览集合
- `apps/web/lib/stores/lightbox.store.ts` — zustand 预览状态（open/items/index/next/prev）
- `apps/web/app/chats/_components/MediaLightbox.tsx` — Dialog 容器 + 键盘交互 + 翻页
- `apps/web/app/chats/_components/LightboxImage.tsx` — 缩放/旋转/拖拽/重试
- `apps/web/app/chats/_components/LightboxVideo.tsx` — 播放/进度/音量/倍速/重试

修改：
- `apps/web/app/chats/_components/MessageContent.tsx` — 图片/视频改为可点击触发预览，图片地址经 `formatFileUrl`
- `apps/web/app/chats/page.tsx` — 挂载 `<MediaLightbox />`

## 审查结论：PASS

### BLOCKER（0）
无。

### WARNING（1，已修复）
- `lightbox.store.ts` 暴露了 `setIndex` action 但全仓无任何消费点，违反 AGENTS.md「禁止以后可能复用的胶水代码」。已移除该 action 及其类型声明。

### NIT（未阻塞，未修改）
- `LightboxImage`/`media_preview/ImagePreview` 在 `scale === 1` 时仍允许指针拖拽位移图片，与既有 Electron 实现行为一致，保持一致不改。
- `onWheel` 内 `event.preventDefault()` 在部分 passive 监听环境下可能产生控制台告警；沿用既有实现模式。
- `MessageContent.tsx` 第 43 行注释「视频预览归属 08」与本任务（07 已接入视频预览）表述不一致，属陈旧注释，未阻塞。
- `LightboxImage` 使用 `<img>` 触发 `@next/next/no-img-element` 告警；因预览任意远端媒体 URL，与仓库既有用法一致，保留。

## 校验
已执行（`apps/web`）：
- `pnpm typecheck` —— 通过，0 错误
- `pnpm lint` —— 0 错误，1 个既有风格告警（no-img-element）

未执行：根目录 `pnpm lint && pnpm typecheck`、`apps/service` 相关命令——本次改动仅涉及 `apps/web`，无 service / prisma / electron 端改动，无需执行。

## 类型/协议一致性
- 复用 `@c_chat/shared-types` 的 `MediaPreviewItem`/`MediaPreviewPayload`，字段（type/fileUrl/mimeType/fileName/fileSize/duration/createTime/senderId）与 `LocalMessageListItem` 对齐，无 `any`、无危险强转。
- 预览集合 `id` 始终取 `message.id`，`initialIndex` 通过 id 匹配，翻页索引经 `clampIndex` 收敛，无越界。
