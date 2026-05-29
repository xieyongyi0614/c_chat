# 媒体预览需求分析与任务编排

## 背景

当前 Electron 桌面端通过独立预览窗口实现图片和视频的沉浸式查看体验，参考 `../requirements/MEDIA_PREVIEW_REQUIREMENTS.md` 定义的产品需求。独立窗口由 `apps/media_preview` 项目实现，支持图片缩放、旋转、切换、视频播放控制和快捷键操作。

Web 端基于 Next.js，运行在浏览器环境中，无法创建独立操作系统窗口。本需求将桌面端独立窗口预览体验复刻为 Web 应用内 Lightbox 或路由弹层形态，保持核心交互一致。

## 当前桌面端实现

### IPC 方法

来自 `packages/shared-types/src/lib/ipc/ipcCallTypes/chatPreloadTypes.ts`：

- `OpenMediaPreview: IpcMethod<OpenMediaPreviewParams, boolean>` — 打开媒体预览窗口，`OpenMediaPreviewParams` 即 `MediaPreviewPayload`
- `GetMediaPreviewPayload: IpcMethod<void, MediaPreviewPayload | null>` — 预览窗口初始化时获取预览数据

### 预览数据结构

来自 `packages/shared-types/src/lib/ipc/webContentEvent.ts`：

```typescript
export interface MediaPreviewPayload {
  items: MediaPreviewItem[];
  initialIndex: number;
  sourceWindowId?: number;
  conversationId?: string;
  messageId?: string;
}

export interface MediaPreviewItem {
  id: string;
  type: 'image' | 'video';
  url?: string;
  fileUrl?: string;
  filePath?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  createTime?: number;
  senderId?: string;
}
```

### 桌面端实现位置

- 独立窗口管理：`apps/electron_client/src/main/windows/mediaPreviewWindow.ts`，单例复用同一预览窗口
- IPC 处理：`apps/electron_client/src/ipc/api/mediaPreviewIpc.ts`
- 独立预览项目：`apps/media_preview`，深色沉浸 UI，图片缩放/旋转/切换、视频播放、快捷键
- 触发点：
  - `apps/frontend/src/pages/chats/components/middle/message/types/ImageGroup.tsx` — 组装图片组 items 和当前 index
  - `apps/frontend/src/pages/chats/components/middle/message/types/VideoMessage.tsx` — 视频消息触发预览

## Web 端目标

Web 端复刻桌面端媒体预览核心交互能力：

- 图片预览：缩放、拖拽、旋转、切换、双击还原
- 视频预览：播放控制、进度拖动、音量、静音、倍速
- 快捷键：Esc 关闭、←→ 切换、+/- 缩放、0 还原、Space 播放暂停、←→ 快退快进
- 形态从独立操作系统窗口改为应用内 Lightbox 组件或 Next.js 并行路由弹层

## 产品需求与验收

### 图片预览

用户点击聊天记录中的图片缩略图后，在应用内打开 Lightbox 显示原图。Lightbox 展示当前图片，并可在同一图片组内左右切换。

验收标准：

- 单张图片点击后打开 Lightbox 并显示原图或可访问的最大图
- 多张图片组点击任意一张后，从该图片作为当前索引进入预览
- 支持上一张、下一张，边界时按钮置灰或循环策略明确
- 支持鼠标滚轮缩放、拖拽移动、双击还原、旋转
- 支持快捷键：`Esc` 关闭，左右方向键切图，`+/-` 缩放，`0` 还原
- 加载失败时展示错误态，并允许重试

### 视频预览

用户点击视频消息缩略图或播放按钮后，在应用内打开 Lightbox 播放视频。

验收标准：

- 视频消息点击后进入 Lightbox 播放，不跳转外部链接
- 支持播放、暂停、进度拖动、音量、静音、倍速
- 支持展示视频文件名、时长、当前播放时间
- 支持加载中、播放失败、格式不支持的提示
- 支持 `Space` 播放/暂停、左右方向键快退/快进、`Esc` 关闭

### 预览容器体验

预览容器参考桌面端深色沉浸背景，媒体内容居中，操作栏弱化但可被发现。

验收标准：

- 深色沉浸背景，媒体内容居中显示
- 操作栏弱化但鼠标移动时可发现
- 关闭预览时释放 object URL 并停止视频播放
- 图片缩放比例限制，例如 `0.2x - 5x`
- 视频控制栏自动隐藏和鼠标移动显示
- 预览容器覆盖整个应用视口，不受聊天区域滚动影响

### 本地与远端资源

预览需要同时支持本地发送中媒体和服务端历史媒体。Web 端无本地文件系统访问能力，本地资源通过 File 或 Blob 对象生成 object URL。

验收标准：

- 有 `fileUrl` 时，预览使用格式化后的远端资源地址
- 无 `fileUrl` 但有 File 或 Blob 对象时，生成 object URL 用于预览
- Web 端不使用 `filePath` 字段，不调用 `ReadLocalFile` IPC
- 切换媒体或关闭预览时释放 object URL
- 本地资源加载失败时显示明确错误态

## Web 适配要点

### 独立窗口到应用内 Lightbox

桌面端通过 `mediaPreviewWindow.ts` 创建独立操作系统窗口，Web 端改为应用内 Lightbox 组件或 Next.js 并行路由实现。

- 桌面端：`OpenMediaPreview` IPC → Electron 主进程创建窗口 → 加载 `apps/media_preview` 页面
- Web 端：前端状态管理或路由触发 → 渲染 Lightbox 组件 → 显示预览内容

### 窗口复用语义

桌面端 `mediaPreviewWindow.ts` 单例复用同一预览窗口，再次打开时更新内容并聚焦。Web 端同页面只有一个 Lightbox 实例，窗口复用语义在 Web 环境无意义。

### 本地文件访问

桌面端通过 `filePath` + `ReadLocalFile` IPC 读取本地文件。Web 端无本地文件系统访问能力，发送中媒体通过 File 或 Blob 对象生成 object URL，不使用 `filePath` 字段。

- 桌面端：`filePath` → `ReadLocalFile` IPC → 主进程读取文件 → 返回 ArrayBuffer → 生成 object URL
- Web 端：File/Blob 对象 → `URL.createObjectURL()` → object URL

### sourceWindowId 字段

桌面端 `MediaPreviewPayload.sourceWindowId` 用于标识来源聊天窗口，支持多账号多窗口场景。Web 端单页应用无多窗口概念，`sourceWindowId` 字段在 Web 环境无实际意义。

## 任务拆分

### 客户端任务

- [ ] 实现 Lightbox 容器组件，深色沉浸背景、内容居中、操作栏弱化可发现
- [ ] 实现图片查看器组件，支持缩放、拖拽、旋转、切换、双击还原
- [ ] 实现视频播放器组件，支持播放控制、进度、音量、静音、倍速
- [ ] 实现快捷键监听，Esc 关闭、←→ 切换/快退快进、+/- 缩放、0 还原、Space 播放暂停
- [ ] 实现资源解析逻辑，`fileUrl` 使用远端地址，File/Blob 生成 object URL
- [ ] 实现 object URL 释放逻辑，切换媒体或关闭预览时释放
- [ ] 实现加载中、加载失败、重试状态
- [ ] `ImageGroup` 组件接入预览触发，组装 items 和 initialIndex
- [ ] `VideoMessage` 组件接入预览触发
- [ ] 实现预览容器路由或状态管理，支持打开、关闭、更新内容

## 阶段编排

### 阶段 0：预览数据结构确认

目标：确定 Web 端预览数据结构，明确与桌面端的差异。

- [ ] 确认 Web 端使用 `MediaPreviewItem` 的字段子集
- [ ] 确认 `filePath` 字段在 Web 端不使用
- [ ] 确认 `sourceWindowId` 字段在 Web 端无实际意义
- [ ] 确认 File/Blob 对象如何传递到预览组件
- [ ] 确认 object URL 生命周期管理策略

产出：

- Web 端预览数据结构定义清晰
- 与桌面端数据结构的映射关系明确

### 阶段 1：Lightbox 容器与图片预览

目标：实现基础 Lightbox 容器和图片查看能力。

- [ ] 实现 Lightbox 容器组件，深色背景、全屏覆盖、居中布局
- [ ] 实现图片加载和显示
- [ ] 实现图片缩放，鼠标滚轮和 +/- 快捷键
- [ ] 实现图片拖拽移动
- [ ] 实现图片旋转
- [ ] 实现双击还原
- [ ] 实现上一张、下一张切换
- [ ] 实现 Esc 关闭、←→ 切换、0 还原快捷键
- [ ] 实现加载中、加载失败、重试状态
- [ ] `ImageGroup` 接入预览触发

产出：

- 用户可以点击图片消息进入 Lightbox 查看大图
- 支持缩放、拖拽、旋转、切换基础操作

### 阶段 2：视频播放

目标：实现视频预览和播放控制。

- [ ] 实现视频播放器组件
- [ ] 实现播放、暂停控制
- [ ] 实现进度条和拖动
- [ ] 实现音量控制和静音
- [ ] 实现倍速控制
- [ ] 实现视频信息展示，文件名、时长、当前时间
- [ ] 实现 Space 播放暂停、←→ 快退快进快捷键
- [ ] 实现视频加载失败、格式不支持状态
- [ ] `VideoMessage` 接入预览触发
- [ ] 关闭预览时停止播放并释放资源

产出：

- 用户可以点击视频消息进入 Lightbox 播放视频
- 支持完整播放控制和快捷键

### 阶段 3：快捷键、资源释放与体验优化

目标：补齐快捷键、资源管理和体验细节。

- [ ] 统一快捷键监听和处理逻辑
- [ ] 实现 object URL 自动释放，切换媒体或关闭预览时
- [ ] 实现操作栏自动隐藏和鼠标移动显示
- [ ] 实现缩放比例限制，例如 `0.2x - 5x`
- [ ] 实现视频控制栏自动隐藏
- [ ] 优化大图加载性能，避免界面卡顿
- [ ] 优化预览容器动画和过渡效果
- [ ] 补充边界状态处理，空 items、无效 index、资源不存在
- [ ] 补充无障碍支持，键盘导航、焦点管理

产出：

- 预览体验流畅，快捷键完整可用
- 资源管理规范，无内存泄漏
- 边界状态处理完整

## 风险点

### 远端视频 Range 支持

远端视频需要服务端支持 HTTP Range 请求，才能实现进度拖动和大文件流式播放。如果服务端不支持 Range，拖动进度和大文件播放体验会变差。

### 大图内存与卡顿

高分辨率图片加载和缩放可能导致内存占用过高和界面卡顿。需要考虑图片尺寸限制、懒加载和渐进式加载策略。

### object URL 泄漏

File 或 Blob 生成的 object URL 需要手动释放，否则会导致内存泄漏。需要在切换媒体、关闭预览、组件卸载时正确释放 object URL。

### 跨消息图片组上下文

桌面端图片组基于相邻图片消息聚合，跨消息时间分隔后的图片不在同一组。Web 端沿用相同聚合限制，不支持跨消息图片组切换。如需支持会话内全部图片浏览，需要额外设计和实现。
