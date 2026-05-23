# 图片视频预览需求分析与任务编排

## 背景

当前聊天窗口承载了会话列表、消息历史、输入区、群详情等主流程，Electron 窗口尺寸偏小。图片、视频等媒体消息如果继续在聊天窗口内做大图预览，会挤占主聊天区域，也很难做出接近微信的沉浸式查看、切换、缩放和播放体验。

本需求希望新增独立预览窗口，并且预览 UI 不写在 `apps/frontend` 中，而是在 `apps` 下新增一个独立 React 项目，例如 `apps/media_preview`。主聊天前端只负责在消息气泡中触发预览，Electron 主进程负责创建和管理预览窗口，新项目负责媒体预览交互。

## 当前基础

### 已具备

- pnpm workspace 已配置 `apps/*`，新增 `apps/media_preview` 会天然纳入工作区。
- 主聊天前端是 Vite + React，构建产物目前输出到 `apps/electron_client/dist/renderer`。
- Electron 主进程已有 `WindowManager`，可以创建多个聊天主窗口，并在开发环境通过 `ELECTRON_RENDERER_PORT = 3000` 加载主前端。
- Preload 已统一暴露 `window.c_chat.ipcCall`、窗口控制能力和 WebContent 事件。
- IPC 已有 `ReadLocalFile`，图片消息可通过本地 `filePath` 读取并生成 object URL。
- 图片消息组件 `ImageGroup` 已能显示服务端 `fileUrl` 或本地 `filePath` 缩略图。
- 视频消息组件 `VideoMessage` 已有播放入口，但当前通过外部链接打开，未形成应用内预览体验。
- 文件上传链路已经保留 `filePath`、`fileUrl`、`mimeType`、`fileName`、`fileSize` 等媒体预览所需基础字段。

### 主要缺口

- 缺少独立媒体预览窗口，当前预览体验要么在聊天窗口内弹层，要么跳到外部浏览器。
- `apps/frontend` 的消息组件还没有统一的“打开媒体预览”IPC 能力。
- Electron 主进程缺少专门的 `MediaPreviewWindowManager` 或等价窗口管理模块。
- 缺少新 React 预览项目、独立端口、独立构建目录和打包加载规则。
- 缺少预览窗口与主窗口之间的媒体数据传递协议。
- 图片组消息未支持从当前图片进入后左右切换同一组图片。
- 视频消息未支持在独立窗口内播放、暂停、进度、音量、全屏/适窗等基础控制。
- 本地文件和远端文件的 URL 规范不统一，预览窗口需要明确通过 IPC 读取本地文件，或通过格式化后的远端 URL 访问资源。

## 一期目标

一期目标是做一个稳定可用的独立媒体预览闭环：

- 用户点击图片消息后，打开独立 Electron 预览窗口。
- 用户点击视频消息后，打开独立 Electron 预览窗口并在窗口内播放。
- 预览窗口由新增 React 项目实现，不放入 `apps/frontend`。
- 预览窗口支持复用：再次点击媒体时更新已有窗口内容并聚焦，避免无限创建窗口。
- 图片支持适窗查看、放大、缩小、拖拽、旋转、上一张、下一张。
- 视频支持播放/暂停、进度拖动、音量、静音、倍速、适窗。
- 预览窗口支持关闭、最小化、置顶或沉浸式深色背景。
- 本地未上传完成的媒体也可以预览，至少图片可通过 `filePath` 读取。
- 上传完成或历史消息中的远端媒体可以预览。

## 非一期范围

- 不做复杂媒体编辑，例如裁剪、涂鸦、马赛克、滤镜。
- 不做跨会话全局媒体库。
- 不做图片 OCR、视频截图、视频转码。
- 不做服务端新增接口。
- 不做移动端适配。
- 不做 DRM、加密媒体播放。
- 不做离线下载队列和断点下载管理。
- 不做完整文件管理器能力，普通文件仍可沿用下载或系统打开。

## 产品需求

### 图片预览

用户点击聊天记录中的图片缩略图后，打开独立预览窗口。预览窗口展示当前图片，并可在同一图片组内左右切换。

验收标准：

- 单张图片点击后打开预览窗口并显示原图或可访问的最大图。
- 多张图片组点击任意一张后，从该图片作为当前索引进入预览。
- 支持上一张、下一张，边界时按钮置灰或循环策略明确。
- 支持鼠标滚轮缩放、拖拽移动、双击还原、旋转。
- 支持快捷键：`Esc` 关闭，左右方向键切图，`+/-` 缩放，`0` 还原。
- 加载失败时展示错误态，并允许重试。

### 视频预览

用户点击视频消息缩略图或播放按钮后，打开独立预览窗口，在窗口内播放视频。

验收标准：

- 视频消息点击后不再跳外部浏览器，而是进入独立预览窗口。
- 支持播放、暂停、进度拖动、音量、静音、倍速。
- 支持展示视频文件名、时长、当前播放时间。
- 支持加载中、播放失败、格式不支持的提示。
- 支持 `Space` 播放/暂停、左右方向键快退/快进、`Esc` 关闭。

### 预览窗口体验

预览窗口参考微信图片/视频预览：以深色沉浸背景为主，媒体内容居中，操作栏弱化但可被发现。

验收标准：

- 默认窗口尺寸建议 `960 x 720`，最小尺寸建议 `640 x 480`。
- 预览窗口独立于聊天主窗口，不挤占聊天区域。
- 再次打开媒体时复用同一个预览窗口并更新内容。
- 预览窗口关闭后释放 object URL、停止视频播放。
- 主窗口关闭不应导致 Electron 进程异常；应用退出时预览窗口一并清理。
- 预览窗口可从主窗口获得当前媒体数据，不直接依赖聊天页 Zustand store。

### 本地与远端资源

预览需要同时支持本地发送中媒体和服务端历史媒体。

验收标准：

- 有 `fileUrl` 时，预览窗口使用格式化后的远端资源地址。
- 无 `fileUrl` 但有 `filePath` 时，通过 IPC 读取本地文件并生成 object URL。
- 本地读取失败时显示明确错误态。
- object URL 在媒体切换或窗口卸载时释放。
- 不把任意本地路径直接暴露给不可信页面；预览窗口只加载本应用打包内页面。

## 技术方案建议

### 新增项目

建议新增 `apps/media_preview`：

- `package.json`：名称建议 `@c_chat/media_preview`。
- `vite.config.ts`：使用 React 插件，开发端口建议新增 `MEDIA_PREVIEW_RENDERER_PORT = 3002`。
- `src/main.tsx`：预览应用入口。
- `src/App.tsx`：媒体预览主界面。
- `src/types.ts`：定义 `PreviewMediaItem`、`OpenMediaPreviewPayload`。
- `src/components/ImagePreview.tsx`：图片查看器。
- `src/components/VideoPreview.tsx`：视频播放器。
- `src/styles/globals.css`：独立预览窗口样式。

构建输出建议：

- 主聊天前端继续输出到 `apps/electron_client/dist/renderer`。
- 媒体预览项目输出到 `apps/electron_client/dist/media-preview`。
- 打包环境下 Electron 预览窗口加载 `dist/media-preview/index.html`。

### 配置与 workspace

- `pnpm-workspace.yaml` 已包含 `apps/*`，无需额外加入 workspace。
- `turbo.json` 的 `package` 任务当前依赖 `@c_chat/frontend#build`，需要增加 `@c_chat/media_preview#build`，否则打包时可能没有预览页面产物。
- `packages/shared-config/src/index.ts` 建议新增：

```ts
export const MEDIA_PREVIEW_RENDERER_PORT = 3002;
```

### Electron 窗口管理

建议不要把媒体预览窗口混入当前多账号聊天 `WindowManager`。当前 `WindowManager` 会初始化聊天窗口数据、绑定 socket、销毁 socket，并以 `windowId` 作为多账号窗口标识；媒体预览窗口不应该占用账号窗口 ID，也不应该创建 socket。

建议新增：

- `apps/electron_client/src/main/windows/mediaPreviewWindow.ts`
- `MediaPreviewWindowManager`
- 单例管理一个预览窗口实例。
- 提供 `open(payload)`、`focus()`、`close()`、`sendPayload(payload)`。

窗口配置建议：

- `width: 960`
- `height: 720`
- `minWidth: 640`
- `minHeight: 480`
- `backgroundColor: '#111111'`
- `frame: false` 或沿用系统标题栏，按现有产品风格确定。
- `webPreferences.preload` 继续使用现有 preload。
- `additionalArguments` 可传入窗口类型，例如 `WINDOW_KIND=media-preview`。

### IPC 与数据协议

建议在 shared-types 中增加媒体预览 IPC 类型：

```ts
export type PreviewMediaType = 'image' | 'video';

export interface PreviewMediaItem {
  id: string;
  type: PreviewMediaType;
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

export interface OpenMediaPreviewParams {
  items: PreviewMediaItem[];
  initialIndex: number;
  sourceWindowId?: number;
  conversationId?: string;
  messageId?: string;
}
```

建议新增 IPC 方法：

- `OpenMediaPreview(params)`：主聊天窗口调用，Electron 创建或更新预览窗口。
- `SetMediaPreviewPayload(params)`：可选，用于预览窗口 ready 后拉取最近一次 payload。
- `GetMediaPreviewPayload()`：预览窗口初始化时主动获取。

也可以通过 `webContents.send` 推送 payload：

- 主窗口调用 `OpenMediaPreview`。
- 主进程缓存 `lastPayload`。
- 若预览窗口已 ready，发送 `media-preview:open`。
- 若预览窗口未 ready，等待 `ready-to-show` 后发送。
- 预览 React 项目通过现有 WebContent 事件能力或新增 preload 订阅 API 接收。

### 主聊天前端接入点

`apps/frontend` 只做最小接入，不承载预览 UI：

- `ImageGroup` 中为每张 `ImagePreview` 增加点击事件。
- 图片组组装 `PreviewMediaItem[]`，点击时传入当前索引。
- `VideoMessage` 将原本外链打开改为调用 `OpenMediaPreview`。
- 发送中或上传中的媒体若有本地 `filePath`，优先传 `filePath`。
- 历史媒体若有 `fileUrl`，传 `fileUrl`。
- 保留上传失败、发送失败状态，不影响点击查看本地文件。

### 预览 React 项目职责

`apps/media_preview` 只关心预览体验：

- 接收 `OpenMediaPreviewParams`。
- 根据当前 item 判断图片或视频。
- 将 `fileUrl` 转为可访问远端 URL。
- 对 `filePath` 调用 `ReadLocalFile` 生成 object URL。
- 管理当前索引、缩放比例、旋转角度、拖拽位置和视频播放状态。
- 处理快捷键。
- 提供加载、错误、空状态。

## 任务编排

### 阶段 0：协议与边界确认

目标：先把主窗口、Electron、预览窗口的边界定清楚。

- [ ] 确认新项目名称为 `apps/media_preview`。
- [ ] 确认开发端口 `MEDIA_PREVIEW_RENDERER_PORT`。
- [ ] 定义 `PreviewMediaItem` 和 `OpenMediaPreviewParams`。
- [ ] 确认预览窗口只复用一个实例。
- [ ] 确认本地路径只通过 IPC 读取，不直接在 URL 中传递给页面。

产出：

- shared-types 中有稳定类型。
- Electron 和两个 React 项目对数据结构理解一致。

### 阶段 1：新增预览 React 项目

目标：`apps/media_preview` 可以独立启动和构建。

- [ ] 新增 `apps/media_preview/package.json`。
- [ ] 新增 Vite React 配置。
- [ ] 配置开发端口和构建输出目录。
- [ ] 引入 `@c_chat/shared-types`、`@c_chat/shared-utils`、`@c_chat/shared-config`、`@c_chat/ui`。
- [ ] 搭建基础深色预览界面。
- [ ] 实现空状态和调试 payload 页面。

产出：

- `pnpm --filter @c_chat/media_preview dev` 可启动。
- `pnpm --filter @c_chat/media_preview build` 可生成 `dist/media-preview`。

### 阶段 2：Electron 预览窗口

目标：主进程可以创建、复用和更新媒体预览窗口。

- [ ] 新增 `MediaPreviewWindowManager`。
- [ ] 新增 `OpenMediaPreview` IPC action handler。
- [ ] 开发环境加载 `http://localhost:3002`。
- [ ] 生产环境加载 `dist/media-preview/index.html`。
- [ ] 预览窗口 ready 后发送或允许拉取 payload。
- [ ] 应用退出和窗口关闭时清理预览窗口引用。
- [ ] 确认预览窗口不创建 socket、不占用账号 `windowId`。

产出：

- 从任意主聊天窗口调用 IPC 可以打开预览窗口。
- 重复调用会更新预览内容并聚焦。

### 阶段 3：图片预览能力

目标：图片消息进入独立预览窗口，并具备基础查看操作。

- [ ] `ImageGroup` 点击图片时调用 `OpenMediaPreview`。
- [ ] 图片组传入同组 items 和当前 index。
- [ ] 预览项目实现图片加载。
- [ ] 支持本地 `filePath` 和远端 `fileUrl`。
- [ ] 支持上一张、下一张。
- [ ] 支持缩放、拖拽、旋转、还原。
- [ ] 支持快捷键。
- [ ] 处理加载中、失败、重试。

产出：

- 图片消息可在独立窗口中查看和切换。

### 阶段 4：视频预览能力

目标：视频消息不再外跳浏览器，而是在独立窗口播放。

- [ ] `VideoMessage` 点击播放时调用 `OpenMediaPreview`。
- [ ] 预览项目实现视频播放器。
- [ ] 支持本地视频和远端视频。
- [ ] 支持播放/暂停、进度、音量、静音、倍速。
- [ ] 支持视频加载失败和格式不支持状态。
- [ ] 支持常用快捷键。
- [ ] 切换媒体或关闭窗口时停止播放并释放资源。

产出：

- 视频消息可在独立窗口中播放。

### 阶段 5：打包与联调

目标：开发和生产环境都能正确加载预览项目。

- [ ] `turbo.json` package 任务增加 `@c_chat/media_preview#build` 依赖。
- [ ] Electron builder 确认 `dist/media-preview` 被打进安装包。
- [ ] 开发环境同时启动 frontend、media_preview、electron_client。
- [ ] 生产构建后验证预览窗口路径。
- [ ] 验证 Windows 路径、本地中文文件名、空格路径。
- [ ] 验证主窗口关闭、预览窗口关闭、应用退出的生命周期。

产出：

- 开发环境和打包应用中预览能力一致可用。

### 阶段 6：体验补齐

目标：接近微信式预览体验，边界状态完整。

- [ ] 顶部展示文件名、索引、发送时间等弱信息。
- [ ] 底部或悬浮工具栏展示缩放、旋转、下载/打开原文件等操作。
- [ ] 图片缩放比例限制，例如 `0.2x - 5x`。
- [ ] 视频控制栏自动隐藏和鼠标移动显示。
- [ ] 预览窗口记忆上次尺寸。
- [ ] 加载大图时避免界面卡死。
- [ ] 统一错误文案和 toast。

产出：

- 常用路径体验顺滑，异常路径可理解。

## 推荐开发顺序

1. 先新增 shared-types 预览数据结构和 `OpenMediaPreview` IPC。
2. 再新增 `apps/media_preview` 并打通开发环境窗口加载。
3. 然后接入 `ImageGroup`，优先完成图片预览闭环。
4. 接着改造 `VideoMessage`，把外跳播放改为独立窗口播放。
5. 最后做打包配置、快捷键、窗口生命周期和体验打磨。

这个顺序能保证最早看到独立窗口效果，也能尽快暴露新 React 项目与 Electron 打包路径的问题。

## 风险点

- 新增 React 项目后，如果 `turbo package` 没有依赖它的 build，生产包会找不到预览页面。
- 当前 `WindowManager` 与账号窗口、socket 生命周期耦合，不适合直接管理预览窗口。
- 本地 `filePath` 不能简单拼成 `file://` 给页面使用，否则会引入权限和路径转义问题；建议继续走 IPC 读取。
- 视频远端资源如果服务端不支持 Range 请求，拖动进度和大文件播放体验会变差。
- 当前部分文件中文注释在普通 `Get-Content` 下会乱码，后续编辑时需要确保 UTF-8 编码。
- 图片组当前只在相邻图片消息聚合时拥有组上下文，跨消息时间分隔后的媒体浏览需要另行设计。
- 如果预览窗口使用无边框窗口，需要补齐拖拽区域、关闭、最小化和焦点可访问性。
- 多账号主窗口同时打开预览时，需要明确预览窗口展示最后一次点击的媒体，还是按账号隔离多个预览窗口。一期建议展示最后一次点击并聚焦。

## 后续二期方向

- 支持普通文件的内置预览，例如 PDF、文本、Office 文件基础信息。
- 支持从当前会话拉取更多历史图片，形成会话媒体浏览器。
- 支持保存图片、复制图片、复制视频链接。
- 支持图片原始尺寸、EXIF 信息和查看文件位置。
- 支持视频截图、画中画、全屏播放。
- 支持预览窗口多实例，按会话或账号隔离。
- 支持预加载前后图片，提升切换速度。
