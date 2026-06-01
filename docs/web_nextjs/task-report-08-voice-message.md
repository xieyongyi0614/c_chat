# Task Report 08 - Web 端语音消息

## 审查范围
Web 端语音消息完整实现（含本轮增量修复）的 git diff 与新增文件。

- 新增：`apps/web/app/chats/_components/VoiceRecorder.tsx`、`VoiceMessage.tsx`、`AudioPlayerBridge.tsx`；`apps/web/lib/media/waveform.ts`；`apps/web/lib/stores/audioPlayer.store.ts`
- 修改：`ChatInput.tsx`、`MessageContent.tsx`、`MessageItem.tsx`、`chats/page.tsx`、`lib/db/index.ts`、`lib/services/upload.service.ts`、`next.config.ts`、`package.json`

## 结论
PASS（BLOCKER 0，WARNING 已修复）

## 问题与处理

### BLOCKER
无。

### WARNING（已修复）
1. WebM 录音时长为 `Infinity` 导致进度条与拖动失效
   - 文件：`apps/web/app/chats/_components/VoiceMessage.tsx`
   - 现象：MediaRecorder 产出 `audio/webm`，`HTMLAudioElement.duration` 在 `loadedmetadata` 时常返回 `Infinity`。原 `totalForProgress = isActive && playerDuration > 0 ? playerDuration : totalSeconds` 中 `Infinity > 0` 为真，导致：
     - 波形进度 `progress = currentSeconds / Infinity = 0`，进度高亮永不前进；
     - `seek` 计算 `ratio * Infinity = Infinity`，`audio.currentTime = Infinity` 拖动无效。
   - 修复：新增 `hasFinitePlayerDuration = Number.isFinite(playerDuration) && playerDuration > 0`，仅当播放器时长为有限正值时采用，否则回退到消息自带 `message.duration`（来自录音 + 服务端 `durationSec`），同时修复进度与 seek。最小改动，无 any、无新增胶水层。

### NIT（未改）
1. `VoiceMessage` 波形 `useEffect` 依赖 `progress`，每次 `timeupdate`（约 4 次/秒）会重新 base64 解码并重设 canvas 尺寸重绘。语音条数多时有少量冗余开销，可后续仅在尺寸变化时重设、用 `requestAnimationFrame` 节流。
2. 播放结束后 `progressMap[key]` 归 0 且 `currentId` 仍指向该条，时长标签短暂显示 `0:00` 后维持，直到再次播放。属于细节体验，不影响功能。
3. 规格中"录音不足最小时长时自动取消"，现实现是停止后提示"录音时间太短"而非静默取消；交互意图一致且更明确，保留。
4. `packages/audio-core/audioPlayerManager.ts` 内残留 `console.log('this.listeners.size', ...)`，属包内既有代码、不在本次 diff 范围，未改动。

## 一致性核对
- 类型契约：`waveform?: string`、`duration?: number` 在 `MessageTableTypes`、`PostUploadInitParams`、`UploadTask` 三处一致；上传链路 `upload -> UploadTask -> uploadInit` 透传完整。
- 服务端回写：`message.service.toLocalMessage` 取 `media.waveform` / `media.durationSec`，`newUpdateMessage` 覆盖 pending 后波形与时长不丢失。
- 协议：波形录音值域 0-100，发送前 `normalizeAndEncodeWaveform` 归一化到 0-31 并 5-bit 打包，渲染端 `decodeWaveformForRender` 解包并 `interpolateArray` 到 40 根，符合 `shared-utils` 波形协议。
- 架构：录音/播放复用 `@c_chat/audio-core` 单例，`next.config.ts` 与 `package.json` 已加入 `@c_chat/audio-core` transpile 与依赖；UI 使用 `@c_chat/ui` Button，无手写基础组件。
- 安全/a11y：录音、播放、取消、发送按钮均带 `aria-label`；无 any / 危险强转；无 placeholder / mock；canvas 颜色取自语义类 `text-primary-foreground` / `text-foreground`，浅色暗色均可读。

## 检查命令
- 已执行 `cd apps/web && pnpm typecheck`：通过。
- 已执行 `cd apps/web && pnpm lint`：0 error，1 warning（`LightboxImage.tsx` 的 `next/image` 提示，属既有文件、不在本次范围）。
- 未执行根目录 `pnpm lint && pnpm typecheck` 与后端命令：本任务仅涉及 `apps/web`，无 schema/migration 改动，无需后端校验。
