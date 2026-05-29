# 语音消息需求分析与任务编排

## 背景

语音消息是 IM 的核心功能之一,包含录音、波形生成与展示、语音消息发送和播放。桌面端使用 Electron 音频采集能力和主进程文件保存,Web 端需要改用浏览器音频 API 实现录音、编码、波形生成和播放。

本文件用于记录语音消息 Web 端复刻需求范围、技术拆解和任务编排,方便后续按阶段开发。

## 当前桌面端实现

### 已具备

桌面端语音消息链路已完整实现,包含以下核心模块:

**IPC 方法** (`packages/shared-types/src/lib/ipc/ipcCallTypes/audioPreloadTypes.ts`):

- `saveVoice: IpcMethod<SaveVoiceParams | undefined, FileInfoListItem>`
  - `SaveVoiceParams: { buffer: ArrayBuffer; metadata: { duration: number; waveform: number[]; mimeType: string } }`
  - 保存录音 buffer 到主进程本地文件,返回文件信息
- `getAudioInfoByLocalPath: IpcMethod<GetAudioInfoByLocalPathParams, AudioWaveformInfo>`
  - `GetAudioInfoByLocalPathParams: { filePath: string }`
  - `AudioWaveformInfo: { duration: number; sampleRate: number; channels: number; bitrate: number; waveform: number[]; waveformBase64: string }`
  - 从本地文件路径解析音频元信息和波形

**主进程音频服务**:

- `apps/electron_client/src/services/audioService.ts` — 主进程音频文件保存、解析、波形生成
- `apps/electron_client/src/ipc/api/audioIpc.ts` — IPC 方法注册和主进程调用桥接
- `packages/audio-core` — 音频核心能力包,封装波形生成、音频解码等底层逻辑

**前端 hooks**:

- `apps/frontend/src/hooks/useAudioRecorder.ts` — 录音状态管理、录音控制、录音结束后调用 `saveVoice`
- `apps/frontend/src/hooks/useAudioMessage.ts` — 语音消息播放控制、进度管理
- `apps/frontend/src/hooks/useWaveformCanvas.ts` — 波形 Canvas 绘制

**播放状态管理**:

- `apps/frontend/src/stores/audioPlayerStore.ts` — 全局单例播放状态,保证同一时间只播放一条语音
- `apps/frontend/src/components/AudioPlayerBridge.tsx` — 全局播放桥接组件,监听 store 变化并控制 Audio 元素

**录音入口**:

- `apps/frontend/src/pages/chats/components/middle/input/RecordingButton.tsx` — 按住录音按钮,显示录音时长,松手发送或取消

**消息渲染**:

- `apps/frontend/src/pages/chats/components/middle/message/types/AudioMessage.tsx` — 语音消息气泡,展示波形、时长、播放按钮和播放进度

## Web 端目标

Web 端需要完整复刻桌面端语音消息能力,包括:

- 录音采集与编码,使用浏览器 MediaRecorder API 替代 Electron 音频采集
- 波形生成与展示,使用 Web Audio API 解码音频并生成波形数据
- 语音消息发送,录音 Blob 走媒体上传链路得到 fileId 和 url 后作为语音消息发送
- 全局单例播放,点击语音消息播放,切换时自动停止上一条,波形随播放进度联动

## 产品需求与验收

### 录音

用户在聊天输入区按住或点击录音按钮开始录音,使用浏览器 MediaRecorder API 采集麦克风音频。

验收标准:

- 点击或按住 `RecordingButton` 开始录音,显示录音时长
- 录音过程中实时更新时长显示
- 松手或点击发送按钮结束录音并发送
- 滑动取消或点击取消按钮结束录音并丢弃
- 麦克风权限被拒时显示权限提示,引导用户授权
- 录音时长不足 1 秒自动取消
- 录音时长超过 60 秒自动结束并发送

### 波形生成

录音结束后,使用 Web Audio API 解码音频 Blob 并生成波形数据和时长信息。

验收标准:

- 录音结束后解码音频 Blob 得到 AudioBuffer
- 从 AudioBuffer 提取波形数据,生成 `waveform: number[]`
- 提取音频时长 `duration: number`
- 提取音频 MIME 类型 `mimeType: string`
- 波形数据归一化到 0-1 范围,采样点数固定为 50-100 个
- 生成的 metadata 结构与桌面端 `SaveVoiceParams.metadata` 一致

### 语音消息发送

录音 Blob 和 metadata 走媒体上传链路,上传成功后作为语音消息发送。

验收标准:

- 录音 Blob 通过媒体上传链路上传到服务端,参考 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)
- 上传成功后得到 `fileId` 和 `url`
- 将 `fileId`、`url`、`duration`、`waveform`、`mimeType` 作为语音消息发送,参考 [04_MESSAGING.md](04_MESSAGING.md)
- 发送失败时显示错误提示,支持重试
- 发送过程中显示 loading 状态
- 发送成功后语音消息出现在消息列表

### 语音播放

点击语音消息播放,全局单例播放,同一时间只播放一条,波形随播放进度联动。

验收标准:

- 点击 `AudioMessage` 播放按钮开始播放
- 播放时显示播放图标,暂停时显示播放按钮
- 播放进度实时更新,波形高亮随进度联动
- 点击波形任意位置跳转到对应播放位置
- 播放完成后自动停止并重置进度
- 切换播放其他语音时,自动停止当前播放
- 全局单例播放状态由 `audioPlayerStore` 管理
- 播放失败时显示错误提示

## Web 适配要点

### 录音采集

桌面端使用 Electron 音频采集能力,Web 端改用浏览器 MediaRecorder API:

- 使用 `navigator.mediaDevices.getUserMedia({ audio: true })` 获取麦克风流
- 使用 `MediaRecorder` 录制音频,推荐编码格式 `audio/webm;codecs=opus` 或 `audio/ogg;codecs=opus`
- 录音结束后得到 `Blob`,MIME 类型由 MediaRecorder 决定

### 波形生成

桌面端通过主进程 `saveVoice` 保存文件并生成波形,Web 端改用浏览器侧生成:

- 使用 `AudioContext.decodeAudioData(arrayBuffer)` 解码录音 Blob
- 从 `AudioBuffer` 提取 PCM 数据并下采样生成波形数组
- 波形归一化到 0-1 范围,采样点数固定为 50-100 个
- 生成的 `metadata: { duration, waveform, mimeType }` 结构与桌面端一致

### 文件保存

桌面端通过主进程 `saveVoice` 保存到本地文件,Web 端改用媒体上传链路:

- 录音 Blob 和 metadata 一起提交到媒体上传链路
- 上传成功后得到 `fileId` 和 `url`
- 不再依赖本地文件路径,直接使用服务端返回的 `url` 播放

### 音频解析

桌面端通过主进程 `getAudioInfoByLocalPath` 从本地文件解析音频信息,Web 端改用浏览器侧解析:

- 接收到语音消息后,如果缺少 `waveform` 或 `duration`,使用 `fetch(url)` 下载音频
- 使用 `AudioContext.decodeAudioData` 解码并生成波形
- 缓存解析结果,避免重复下载和解析

### 全局播放

桌面端 `AudioPlayerBridge` 全局单例播放逻辑可大体复用:

- `audioPlayerStore` 管理当前播放的 messageId、播放状态、播放进度
- `AudioPlayerBridge` 监听 store 变化,控制 Audio 元素播放、暂停、跳转
- 切换播放时自动停止上一条
- Web 端直接使用 `url` 播放,不再依赖本地文件路径

## 任务拆分

### 客户端任务

- [ ] 实现 MediaRecorder 录音 hook,封装录音开始、停止、取消、权限处理
- [ ] 实现 Web Audio API 波形生成,从录音 Blob 解码并生成 `metadata: { duration, waveform, mimeType }`
- [ ] 录音 Blob 接入媒体上传链路,上传成功后得到 `fileId` 和 `url`
- [ ] 语音消息发送,将 `fileId`、`url`、`duration`、`waveform`、`mimeType` 作为消息体发送
- [ ] 全局单例播放,复用 `audioPlayerStore` 和 `AudioPlayerBridge` 逻辑,使用 `url` 播放
- [ ] 波形进度联动,播放时高亮波形,点击波形跳转播放位置
- [ ] 录音按钮 UI,显示录音时长、取消和发送交互
- [ ] 语音消息气泡 UI,展示波形、时长、播放按钮和播放进度
- [ ] 麦克风权限处理,权限被拒时显示提示
- [ ] 录音时长限制,不足 1 秒取消,超过 60 秒自动发送
- [ ] 播放失败处理,显示错误提示
- [ ] 发送失败处理,显示错误提示和重试

## 阶段编排

### 阶段 0:音频数据形态确认

目标:确认 Web 端录音格式、波形生成算法、metadata 结构与桌面端一致。

- [ ] 确认 MediaRecorder 编码格式,推荐 `audio/webm;codecs=opus` 或 `audio/ogg;codecs=opus`
- [ ] 确认波形生成算法,采样点数、归一化范围与桌面端一致
- [ ] 确认 `metadata: { duration, waveform, mimeType }` 结构与桌面端 `SaveVoiceParams.metadata` 一致
- [ ] 确认媒体上传链路支持音频 Blob 上传,返回 `fileId` 和 `url`
- [ ] 确认语音消息协议字段,包含 `fileId`、`url`、`duration`、`waveform`、`mimeType`

产出:

- 音频数据形态文档,明确录音格式、波形结构、上传和发送协议

### 阶段 1:录音与波形生成

目标:用户能在 Web 端录音并看到波形。

- [ ] 实现 `useMediaRecorder` hook,封装 MediaRecorder 录音逻辑
- [ ] 实现麦克风权限请求和错误处理
- [ ] 实现录音时长计时和显示
- [ ] 实现录音结束后生成 Blob
- [ ] 实现 `useAudioWaveform` hook,从 Blob 解码并生成 `metadata`
- [ ] 实现录音按钮 UI,显示录音状态和时长
- [ ] 实现录音取消和发送交互
- [ ] 实现录音时长限制,不足 1 秒取消,超过 60 秒自动发送

产出:

- 用户能在 Web 端录音,录音结束后看到波形和时长

### 阶段 2:语音消息发送

目标:录音后能发送语音消息,依赖媒体上传链路。

- [ ] 录音 Blob 接入媒体上传链路,参考 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)
- [ ] 上传成功后得到 `fileId` 和 `url`
- [ ] 将 `fileId`、`url`、`duration`、`waveform`、`mimeType` 作为语音消息发送,参考 [04_MESSAGING.md](04_MESSAGING.md)
- [ ] 发送过程中显示 loading 状态
- [ ] 发送失败时显示错误提示和重试
- [ ] 发送成功后语音消息出现在消息列表

产出:

- 用户能在 Web 端录音并发送语音消息

### 阶段 3:全局播放与进度联动

目标:点击语音消息播放,全局单例播放,波形随播放进度联动。

- [ ] 复用 `audioPlayerStore` 管理全局播放状态
- [ ] 复用或改造 `AudioPlayerBridge`,使用 `url` 播放
- [ ] 实现 `AudioMessage` 播放按钮和播放状态显示
- [ ] 实现播放进度实时更新
- [ ] 实现波形高亮随播放进度联动
- [ ] 实现点击波形跳转播放位置
- [ ] 实现切换播放时自动停止上一条
- [ ] 实现播放完成后自动停止并重置进度
- [ ] 实现播放失败错误提示
- [ ] 接收到语音消息后,如果缺少 `waveform` 或 `duration`,下载并解析音频

产出:

- 用户能在 Web 端播放语音消息,全局单例播放,波形随进度联动

## 风险点

### 浏览器录音格式兼容性

MediaRecorder 编码格式在不同浏览器中支持情况不同:

- Chrome/Edge 支持 `audio/webm;codecs=opus`
- Firefox 支持 `audio/ogg;codecs=opus`
- Safari 支持 `audio/mp4`

需要在录音前检测浏览器支持的格式,优先使用 `audio/webm;codecs=opus`,降级到 `audio/ogg;codecs=opus` 或 `audio/mp4`。服务端和对端需要支持多种音频格式解码和播放。

### 麦克风权限

浏览器麦克风权限需要用户主动授权,权限被拒时需要显示友好提示,引导用户在浏览器设置中授权。部分浏览器在 HTTPS 环境下才允许访问麦克风,本地开发需要使用 `localhost` 或配置 HTTPS。

### MediaRecorder 跨浏览器差异

MediaRecorder API 在不同浏览器中行为存在差异:

- `ondataavailable` 触发时机不同,部分浏览器需要设置 `timeslice` 参数
- 录音结束后 Blob 生成时机不同,需要监听 `onstop` 事件
- 部分浏览器不支持 `audioBitsPerSecond` 参数

需要在多个浏览器中测试录音流程,确保兼容性。

### 波形生成性能

Web Audio API 解码音频和生成波形需要一定计算量,长音频可能导致 UI 卡顿。建议:

- 波形采样点数固定为 50-100 个,避免过多计算
- 解码和波形生成放在 Web Worker 中执行,避免阻塞主线程
- 缓存已解析的波形数据,避免重复计算

### 依赖媒体上传链路

语音消息发送依赖媒体上传链路,需要确保:

- 媒体上传链路支持音频 Blob 上传,参考 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)
- 上传失败时有明确错误提示和重试机制
- 上传过程中显示进度,避免用户等待焦虑
- 上传成功后返回的 `url` 可以直接用于播放

如果媒体上传链路尚未实现,语音消息发送将被阻塞。建议优先完成媒体上传链路开发。
