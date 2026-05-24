# IM 音视频通话需求分析与任务编排

## 背景

当前系统已经具备单聊消息、WebSocket 实时通信、多窗口登录、文件上传、分片上传、上传任务、音频消息 waveform 和本地消息存储能力。新增音视频通话后，系统会从“消息型 IM”进入“实时媒体型 IM”，复杂度主要来自四类问题：

- 媒体链路：采集、编码、传输、播放、弱网、NAT 穿透和重连。
- 信令链路：呼叫邀请、接听、拒接、挂断、超时、忙线、SDP、ICE candidate 和状态同步。
- 桌面端能力：系统通知、来电弹窗、多窗口同步、设备切换、权限、全局快捷键和悬浮窗。
- 长期扩展：从单人 P2P 语音/视频扩展到多人通话、屏幕共享和 SFU。

本需求文档用于明确 Electron + React + NestJS 架构下的音视频通话系统边界、技术选型、数据模型、协议规划和分阶段开发路线。本文只做需求分析与任务编排，不进入代码实现。

## 当前基础

### 已有能力

- WebSocket 已用于 IM 实时通信，可作为通话 signaling 的第一入口。
- protobuf 和 shared packages 已承载跨端协议，适合新增 call 协议域。
- Electron 已支持多窗口登录和 IPC，可扩展为多窗口通话状态同步。
- 前端 React + Zustand 已承载聊天页状态，可新增通话会话状态与 UI overlay。
- 本地 SQLite 已承载消息和上传任务，可扩展通话中本地状态缓存。
- 服务端 NestJS 已有 REST API、WebSocket Gateway、Prisma 和 MySQL，可承载 call session、participant、history 和事件日志。
- 文件、音频和媒体预览链路已有基础，对通话录制、通话消息卡片、设备媒体权限等后续能力有复用价值。

### 主要缺口

- 缺少 WebRTC peer connection 管理层。
- 缺少 signaling 消息模型和 protobuf 协议。
- 缺少通话状态机、超时、忙线、重连和幂等边界。
- 缺少 STUN/TURN 基础设施和 TURN 鉴权。
- 缺少 Electron 设备管理、权限管理、系统来电弹窗、通知和多窗口同步。
- 缺少通话记录、参与者、rtc 事件和设备状态数据模型。
- 缺少音视频 UI，包括来电页、通话中 overlay、mini floating window 和屏幕共享入口。
- 缺少弱网、断线、ICE restart、网络切换和客户端崩溃恢复策略。

## 一期目标

一期目标是完成稳定可用的单人音视频通话闭环：

- 支持单人语音通话和单人视频通话。
- 支持来电提醒、接听、拒接、挂断、超时和忙线。
- 支持麦克风静音、摄像头开关、音频输出设备切换。
- 支持通话中从语音升级到视频，或至少预留协议字段。
- 支持 ICE candidate 同步、基础 ICE 失败重连和网络异常提示。
- 支持 Electron 主窗口与多账号窗口之间的通话状态同步。
- 支持系统通知和应用内来电弹窗。
- 支持通话记录落库和会话内通话消息卡片。
- 支持 TURN 服务接入，保证复杂 NAT 下可建立连接。

## 非一期范围

- 多人群组通话。
- 自建 SFU 正式生产接入。
- 通话录制、云端录制、实时转写和字幕。
- 端到端加密的自研密钥协商。
- 复杂音频处理平台，例如服务端混音、主动说话人检测。
- 移动端适配。
- 管理后台、计费、通话质量大盘。
- 企业级设备策略和会议室系统。

## 整体系统架构

推荐将通话系统拆为五层：

1. Electron 原生能力层
   - 管理系统通知、来电窗口、悬浮窗、全局快捷键、设备枚举、权限申请和多窗口广播。
   - 不直接写 WebRTC 业务状态，只提供受控 IPC 能力。

2. React 通话体验层
   - 聊天页按钮、来电弹窗、通话 overlay、mini floating window、设备选择和错误提示。
   - 通过 Zustand 订阅通话状态，不直接操作 signaling 细节。

3. Client Call Core
   - `CallManager` 管理业务状态机：拨打、来电、接听、拒接、挂断、超时、忙线、重连。
   - `RTCManager` 管理 WebRTC：media stream、peer connection、SDP、ICE、track、device switch、screen share。
   - 两者保持边界：CallManager 只理解通话业务，RTCManager 只理解媒体连接。

4. Signaling Server
   - 复用 NestJS WebSocket Gateway，新增 call signaling namespace 或 call 事件域。
   - 负责鉴权、路由、状态落库、超时调度、幂等处理、多设备同步和离线处理。
   - 不转发媒体流，只转发 SDP、ICE candidate 和 call control event。

5. RTC Infrastructure
   - 一期使用 P2P WebRTC + STUN/TURN。
   - 后续多人通话和高可靠场景引入 SFU，例如 mediasoup、LiveKit、Janus 或 Pion。

## 技术选型建议

### WebRTC 是否适合

WebRTC 适合当前目标。它天然支持浏览器/Electron 音视频采集、编码、NAT 穿透、加密传输、设备切换、屏幕共享和网络质量反馈。Electron 的 Chromium WebRTC 能力足以支撑 Telegram Desktop / Discord 风格的一期单聊通话。

需要注意的是，WebRTC 只解决媒体连接，不解决“谁呼叫谁、谁在线、谁忙线、何时超时、如何恢复”的业务状态。这些必须由 signaling server 和客户端状态机显式设计。

### P2P 与 SFU 边界

一期单人通话建议采用 P2P：

- 架构简单，服务端成本低。
- 音视频端到端延迟低。
- 适合 1v1 语音、1v1 视频和桌面屏幕共享。

需要引入 SFU 的边界：

- 多人通话超过 2 人。
- 需要服务端转发、多端订阅不同清晰度、主动说话人、弱网分层。
- 需要录制、旁路直播、会议控制、服务端质量监控。
- P2P 在企业 NAT、对称 NAT、跨地区网络下成功率不可接受。

建议路线：

- MVP：P2P + TURN。
- 二期：保留 call session / participant / media route 抽象，接入 SFU 但不改变前端业务状态机。
- 三期：多人通话统一走 SFU，单聊可继续 P2P，也可按配置走 SFU。

### 是否需要 TURN

需要。只依赖 STUN 的 P2P 在对称 NAT、企业网络、校园网、代理网络下失败率较高。桌面 IM 不能接受“部分网络无法拨通”的体验。

建议部署：

- STUN/TURN 使用 coturn。
- TURN 支持 UDP、TCP、TLS 443。
- 外网部署至少两个区域或两个节点。
- 使用短期凭证，服务端按用户和 call session 签发 username/password。
- TURN 域名使用独立子域，例如 `turn.example.com`。
- 生产环境开启带宽、并发、日志和告警监控。

### codec 选择

音频：

- 首选 Opus。
- 开启 DTX、FEC，弱网时降低 bitrate。
- 语音通话优先保证音频连续性，视频可以主动降级或关闭。

视频：

- Electron/Chromium 默认优先 VP8/H264，首期不要强行指定复杂 codec 策略。
- 需要兼容硬件加速和不同系统编码器差异。
- 后续 SFU 阶段再考虑 VP9/AV1/SVC。

屏幕共享：

- 一期可用 Chromium `getDisplayMedia`。
- 需要明确 Electron 桌面捕获权限、窗口选择、停止共享和共享中切换窗口。

### Electron 中 WebRTC 的坑

- 权限：摄像头、麦克风、屏幕录制权限在 macOS/Windows 表现不同，必须在 Electron 主进程处理 permission request。
- 设备枚举：未授权前设备 label 可能为空，授权后需要重新枚举。
- 音频输出：`setSinkId` 支持情况需要验证，Electron 版本和系统差异会影响输出设备切换。
- 多窗口：多个 renderer 同时创建 WebRTC 连接会造成状态冲突。建议单个主通话 owner window 持有 RTC，其他窗口只订阅状态。
- 生命周期：窗口关闭、刷新、崩溃、休眠唤醒都可能导致 track 停止或 ICE disconnected。
- 回声消除：桌面端需要显式关注 echoCancellation、noiseSuppression、autoGainControl。
- 屏幕共享：不同平台对系统音频共享支持不同，不要在一期承诺所有平台都能共享系统声音。

## 模块拆分

### apps/service

- `api/call`
  - REST：通话历史、TURN credentials、设备状态查询。
  - WebSocket：call signaling。
- `call.service.ts`
  - call session 生命周期、participant 状态、忙线判断、通话记录。
- `call.gateway.ts`
  - signaling 消息分发、鉴权、目标用户在线设备路由。
- `call-timeout.service.ts`
  - 来电超时、无人接听、异常挂断补偿。

### packages/shared-protobuf

- 新增 `Call.proto` 或在现有 `Chat.proto` 中增加 call 消息域。
- 建议独立 call 协议文件，避免聊天消息协议继续膨胀。

### packages/shared-types

- 通话状态、设备状态、IPC 参数、TURN credential 类型。
- 保持 snake_case 后端契约，不在前端多套字段适配。

### apps/electron_client

- `ipc/api/callIpc.ts`
  - open incoming call window、show notification、device list、permission、global shortcut。
- `main/windows/callWindow`
  - 系统级来电窗口和通话悬浮窗。
- `main/call/callStateBridge`
  - 多窗口通话状态广播，只做同步，不承载业务状态机。

### apps/frontend

- `pages/chats/.../_components/call`
  - 通话按钮、来电弹窗、通话 overlay、mini floating view。
- `lib/call`
  - `CallManager`、`RTCManager`、signaling client、media device helpers。
- Zustand store
  - `callStore` 保存 UI 所需状态，避免把 WebRTC 对象放入全局可序列化状态。

## 通话流程时序

### 主叫发起通话

1. 用户在单聊会话点击语音或视频通话。
2. 前端请求 `CallInvite`，携带 `conversation_id`、`callee_id`、`call_type`、`client_call_id`。
3. 服务端鉴权、检查会话关系、检查双方忙线状态。
4. 服务端创建 `call_session` 和双方 `call_participant`。
5. 服务端向被叫所有在线设备推送 `CallIncoming`。
6. 主叫进入 `calling`，启动本地超时计时。
7. 被叫接听后，服务端广播 `CallAccepted`。
8. 双方开始 SDP offer/answer 和 ICE candidate 交换。
9. WebRTC connected 后，服务端更新通话状态为 `connected`，客户端进入 `in_call`。

### 被叫拒接

1. 被叫点击拒接。
2. 客户端发送 `CallReject`。
3. 服务端校验 participant，更新 session 为 `rejected`。
4. 服务端向主叫和被叫其他窗口广播 `CallEnded`。
5. 客户端清理媒体资源，生成通话记录和消息卡片。

### 超时

1. 服务端创建 session 后注册超时任务，例如 30 秒。
2. 被叫未接听且主叫未取消时，服务端将 session 标记为 `timeout`。
3. 广播 `CallEnded(reason=timeout)`。
4. 客户端停止铃声、关闭来电弹窗、释放本地采集。

### 挂断

1. 任一方发送 `CallHangup`。
2. 服务端判断 session 是否仍可结束，幂等更新为 `ended`。
3. 广播 `CallEnded`，写入 `ended_at`、`duration`、`end_reason`。
4. 客户端关闭 peer connection、停止 tracks、同步 UI。

### ICE 重连

1. 客户端监听 `iceconnectionstatechange`。
2. `disconnected` 时进入 `reconnecting`，保留通话 UI 和音频状态。
3. 超过短阈值后触发 ICE restart，发送新的 offer。
4. `connected/completed` 后恢复 `in_call`。
5. 超过最大阈值仍失败时，由客户端或服务端结束通话，reason 为 `network_error`。

## 数据流

### 控制数据

React UI -> CallManager -> signaling client -> WebSocket -> NestJS CallGateway -> 目标用户设备 -> CallManager -> RTCManager

控制数据包括 invite、accept、reject、cancel、hangup、busy、timeout、device_state、mute、camera、screen_share 和 reconnect。

### 媒体数据

RTCManager -> RTCPeerConnection -> P2P WebRTC -> remote RTCManager -> audio/video element

服务端不经手媒体流。一期只记录状态和事件，不记录音视频内容。

### Electron 数据

React -> preload bridge -> Electron IPC -> main process -> notification/window/global shortcut/device permission -> 多窗口广播 -> renderer

Electron 主进程只暴露白名单能力，不让 renderer 直接访问 Node.js、文件系统或任意系统 API。

## 状态机设计

### CallSession 状态

- `idle`：本地无通话。
- `inviting`：主叫已发起，等待服务端确认。
- `ringing_outgoing`：主叫等待被叫接听。
- `ringing_incoming`：被叫来电中。
- `accepted`：已接听，准备交换 SDP。
- `connecting`：SDP / ICE 建连中。
- `in_call`：媒体连接建立。
- `reconnecting`：ICE 或 WebSocket 异常恢复中。
- `ending`：正在挂断或清理。
- `ended`：正常结束。
- `rejected`：被叫拒接。
- `cancelled`：主叫取消。
- `timeout`：无人接听。
- `busy`：对方忙线。
- `failed`：信令、权限或媒体建连失败。

### 关键状态约束

- 同一用户同一时间只允许一个活跃 call session。
- `ended/rejected/cancelled/timeout/failed` 为终态，后续事件只能幂等忽略。
- SDP 和 ICE 只允许在 `accepted/connecting/in_call/reconnecting` 阶段处理。
- 来电超时以服务端为准，客户端计时只用于 UI。
- 忙线判断以服务端活跃 participant 为准，不能只依赖客户端状态。

## 数据库设计建议

### call_session

- `id`
- `conversation_id`
- `call_type`：`audio` / `video`
- `mode`：`p2p` / `sfu`
- `initiator_id`
- `state`
- `start_at`
- `accepted_at`
- `connected_at`
- `ended_at`
- `duration`
- `end_reason`
- `sfu_room_id`
- `created_at`
- `updated_at`

建议索引：

- `initiator_id + state`
- `conversation_id + created_at`
- `state + updated_at`

### call_participant

- `id`
- `call_id`
- `user_id`
- `device_id`
- `role`
- `state`
- `joined_at`
- `left_at`
- `mute_audio`
- `mute_video`
- `screen_sharing`
- `network_state`
- `last_seen_at`

建议约束：

- `call_id + user_id + device_id` 唯一。
- 活跃通话按 `user_id + state` 建索引。

### call_history

- `id`
- `call_id`
- `conversation_id`
- `user_id`
- `peer_user_id`
- `direction`：`incoming` / `outgoing`
- `call_type`
- `result`
- `duration`
- `started_at`
- `ended_at`

说明：`call_history` 面向用户视角，便于会话内展示和后续搜索；`call_session` 面向系统事实。

### rtc_event

- `id`
- `call_id`
- `user_id`
- `device_id`
- `event_type`
- `payload`
- `created_at`

说明：只记录必要诊断事件，例如 SDP exchanged、ICE failed、reconnect、device changed、permission denied。不要记录完整 SDP 中敏感信息，或至少脱敏。

### device_state

- `id`
- `user_id`
- `device_id`
- `window_id`
- `platform`
- `app_version`
- `online_state`
- `active_call_id`
- `mic_available`
- `camera_available`
- `speaker_available`
- `updated_at`

说明：可先不持久化完整设备清单，只存在线设备和活跃通话状态。设备 label 不建议长期落库。

## websocket/protobuf 消息规划

### 控制消息

- `CallInviteRequest`
- `CallInviteResponse`
- `CallIncomingNotify`
- `CallAcceptRequest`
- `CallRejectRequest`
- `CallCancelRequest`
- `CallHangupRequest`
- `CallEndedNotify`
- `CallBusyNotify`
- `CallTimeoutNotify`
- `CallStateSyncNotify`

### RTC 消息

- `CallSdpOffer`
- `CallSdpAnswer`
- `CallIceCandidate`
- `CallIceRestartRequest`
- `CallIceRestartNotify`

### 设备和媒体状态

- `CallDeviceStateUpdate`
- `CallMuteAudioUpdate`
- `CallCameraStateUpdate`
- `CallScreenShareStateUpdate`
- `CallNetworkStateUpdate`

### 建议基础字段

所有 call signaling 消息建议包含：

- `call_id`
- `client_call_id`
- `conversation_id`
- `sender_id`
- `target_user_id`
- `sender_device_id`
- `target_device_id`
- `seq`
- `timestamp`

其中 `client_call_id` 用于客户端发起幂等，`seq` 用于客户端乱序保护，服务端时间用于最终状态裁决。

## 安全性分析

### Electron 安全

- 保持 contextIsolation，关闭 nodeIntegration。
- preload 只暴露白名单 IPC 方法。
- IPC 参数必须有明确类型和来源校验，不能让 renderer 传任意 channel。
- 本地设备、通知、窗口控制、快捷键只通过受控 API 暴露。
- 来电窗口和悬浮窗只加载本地应用页面，不加载外部 URL。

### WebRTC 安全

- WebRTC 媒体默认 DTLS-SRTP 加密。
- signaling 必须走已鉴权 WebSocket。
- SDP 和 ICE candidate 不写入普通业务日志，诊断日志需要脱敏。
- 屏幕共享必须有明确用户动作触发，不能后台自动开始。

### TURN 鉴权

- 使用短期 TURN credentials。
- 凭证由服务端按登录用户和 call session 签发。
- 设置较短 TTL，例如 5-10 分钟。
- 不在客户端写死 TURN 密码。

### signaling 鉴权

- 每个 call 请求校验登录态、会话关系和 participant 身份。
- accept/reject/hangup/ice/sdp 都必须校验用户属于当前 call。
- 忙线和终态由服务端裁决。
- 多设备场景下，只有接听设备成为媒体 owner，其他设备同步状态但不参与 SDP。

## 风险点

- P2P 在复杂 NAT 下失败率不可忽视，TURN 是一期必需项。
- 没有清晰状态机时，拒接、取消、超时、挂断很容易乱序产生幽灵通话。
- Electron 多窗口如果都能操作 RTC，会导致重复采集、重复响铃和状态抢占。
- ICE restart 和 WebSocket reconnect 是两条恢复链路，不能混为一谈。
- 设备切换在不同系统和 Electron 版本上行为不完全一致。
- 屏幕共享涉及系统权限，macOS 首次授权后通常需要重启应用。
- 通话 UI 若依赖聊天页生命周期，切换会话或关闭窗口可能误杀通话。
- 记录完整 SDP、candidate 或设备 label 可能带来隐私风险。

## 性能瓶颈

- 视频编码会占用 CPU/GPU，低端设备需要优先降分辨率和帧率。
- TURN 中继会显著增加带宽成本和延迟。
- 多窗口同时渲染视频会增加 GPU 和内存压力。
- 屏幕共享高分辨率下码率较高，需要默认限制帧率。
- WebSocket signaling 本身压力不大，但重连风暴和事件日志写入需要限流。
- SFU 阶段服务端带宽、转发线程、订阅层级和录制会成为主要瓶颈。

## MVP 方案

MVP 建议只做：

- 单人语音通话。
- 单人视频通话。
- P2P WebRTC。
- STUN + TURN。
- 来电、接听、拒接、挂断、超时、忙线。
- 麦克风静音、摄像头开关。
- 基础设备选择。
- 基础 ICE 失败提示和一次 ICE restart。
- 通话记录和会话内通话卡片。
- 一个主通话窗口持有 RTC，多窗口只同步状态。

MVP 暂不做：

- 群聊通话。
- SFU。
- 屏幕共享。
- 录制。
- 复杂质量面板。
- 全局快捷键的完整可配置化。

## 分阶段开发路线

### 阶段 0：技术验证

目标：验证 Electron + WebRTC + TURN 在当前工程和目标平台上可用。

- [ ] 创建最小 WebRTC P2P demo，不接入业务 UI。
- [ ] 验证 getUserMedia、getDisplayMedia、enumerateDevices。
- [ ] 验证 Windows/macOS 麦克风、摄像头、扬声器权限。
- [ ] 部署 coturn 测试环境。
- [ ] 验证对称 NAT 或企业网络下 TURN 中继。
- [x] 验证 Electron 多窗口只允许一个 RTC owner。

产出：

- 一份 WebRTC 能力验证记录。
- 明确 Electron 版本、平台权限和 TURN 配置边界。

### 阶段 1：协议与状态机

目标：先定 call 协议和服务端状态裁决。

- [x] 定义 call protobuf 消息。
- [x] 定义 call session 状态机和终态规则。
- [x] 定义 busy、timeout、reject、cancel、hangup 幂等规则。
- [x] 定义 SDP/ICE 消息流和乱序处理。
- [x] 定义多设备接听策略。

产出：

- shared-protobuf 可生成。
- 前后端对 call 状态语义一致。

### 阶段 2：服务端 signaling 闭环

目标：服务端可以完成不含真实媒体的通话业务流。

- [ ] 新增 call session、participant、history、rtc_event 表。
- [x] 实现 CallGateway。
- [x] 实现 invite、incoming、accept、reject、cancel、hangup。
- [ ] 实现 timeout 调度与通知。
- [x] 实现忙线判断。
- [ ] 实现多设备状态同步。
- [ ] 实现 TURN credential API。

产出：

- 两个在线用户可以通过 signaling 完成一次模拟通话。
- 通话记录正确落库。

### 阶段 3：客户端 CallManager

目标：前端具备稳定业务状态机。

- [x] 新增 call store。
- [x] 实现 CallManager。
- [x] 接入 WebSocket call 事件。
- [x] 接入 Electron 多窗口状态广播。
- [x] 处理窗口关闭、刷新、断线和重连恢复。
- [x] 实现来电铃声和应用内来电弹窗。

产出：

- 不接入真实音视频时，UI 状态完整可跑。

### 阶段 4：RTCManager 与媒体闭环

目标：完成真实 1v1 音视频通话。

- [ ] 实现本地媒体采集。
- [ ] 实现 RTCPeerConnection 创建和销毁。
- [ ] 实现 SDP offer/answer。
- [ ] 实现 ICE candidate 同步。
- [ ] 实现 remote track 播放。
- [ ] 实现麦克风静音、摄像头开关、设备切换。
- [ ] 实现 ICE disconnected 后重连策略。

产出：

- 单人语音和视频通话可用。

### 阶段 5：Electron 桌面体验

目标：补齐桌面 IM 体验。

- [ ] 原生通知。
- [ ] 系统级来电窗口。
- [ ] mini floating window。
- [ ] 全局快捷键：静音、挂断、接听。
- [ ] 权限提示和设备不可用提示。
- [ ] 多窗口来电去重和状态同步。

产出：

- 接近 Telegram Desktop / 微信桌面端的一期通话体验。

### 阶段 6：弱网与质量优化

目标：提升真实网络可用性。

- [ ] 音频优先策略。
- [ ] 弱网下降视频码率、分辨率或帧率。
- [ ] ICE restart 策略调优。
- [ ] 网络变化后自动恢复。
- [ ] 通话质量事件采样。
- [ ] 异常挂断补偿。

产出：

- 常见弱网和网络切换场景可恢复或可解释失败。

### 阶段 7：屏幕共享

目标：增加桌面通话核心能力。

- [ ] 接入 getDisplayMedia。
- [ ] 设计 screen share track 替换或附加策略。
- [ ] 增加共享状态同步。
- [ ] 增加共享停止、切换源、权限异常处理。
- [ ] 明确系统音频支持边界。

产出：

- 1v1 通话中可共享屏幕。

## 后续扩展方案

### 多人通话

- 引入 SFU。
- `call_session.mode` 使用 `sfu`。
- `call_participant` 扩展 publish/subscribe 状态。
- 新增 room control：邀请成员、踢出、静音管理、主动说话人。

### SFU 技术路线

优先考虑成熟方案：

- LiveKit：工程完整、客户端 SDK 完整，适合快速产品化。
- mediasoup：灵活度高，适合深度自定义，但工程成本更高。
- Janus：成熟稳定，但业务层封装需要更多工作。
- Pion：Go 生态，适合自研服务端媒体能力。

建议不要一开始自研 SFU。先用 P2P 把通话产品闭环和状态机打稳，再替换媒体路由。

### 音频优先优化

- 弱网时优先保障 Opus 音频。
- 视频卡顿时提示“网络较差，已优先保证语音”。
- 支持用户一键关闭视频。
- 后续可加入音频设备热插拔检测和回声检测提示。

## 任务拆分与开发编排

### A. 架构与基础设施

- [ ] 确定 P2P + TURN 作为一期架构。
- [ ] 部署 coturn 测试环境。
- [ ] 定义 call 协议和状态机。
- [ ] 确定是否新增独立 call protobuf 文件。
- [ ] 明确单个 RTC owner window 策略。

### B. 服务端

- [ ] 新增 call 数据模型和 migration。
- [x] 实现 CallGateway。
- [x] 实现 CallService。
- [x] 实现 busy。
- [ ] 实现 timeout 调度与通知。
- [ ] 实现 TURN credential。
- [x] 实现 call history。
- [x] 补服务端状态机测试。

### C. Electron

- [ ] 新增 call IPC 白名单。
- [ ] 新增来电窗口或通知能力。
- [ ] 新增多窗口状态广播。
- [ ] 新增设备权限和设备枚举能力。
- [ ] 新增全局快捷键。
- [ ] 新增 mini floating window。

### D. Frontend

- [x] 新增 call store。
- [x] 实现 CallManager。
- [ ] 实现 RTCManager。
- [ ] 聊天页增加语音/视频通话入口。
- [x] 实现来电 UI。
- [ ] 实现通话中 overlay。
- [ ] 实现设备选择、静音、摄像头开关。
- [ ] 实现通话结束消息卡片。

### E. 质量与验收

- [ ] 验证同一用户多窗口只响铃一次或按产品策略响铃。
- [ ] 验证主叫取消和被叫接听并发竞态。
- [ ] 验证拒接、超时、挂断幂等。
- [ ] 验证网络断开和恢复。
- [ ] 验证 TURN 中继。
- [ ] 验证麦克风、摄像头和扬声器热切换。
- [ ] 验证 Windows/macOS 权限体验。

## 推荐开发顺序

1. 先做 WebRTC + TURN 技术验证，不接入业务代码。
2. 再定 protobuf、状态机和数据库模型。
3. 接着做服务端 signaling 闭环。
4. 然后做前端 CallManager，不接真实媒体。
5. 再接 RTCManager，完成真实 1v1 音视频。
6. 最后补 Electron 桌面能力、弱网恢复和屏幕共享。

这个顺序能先暴露 WebRTC 和 Electron 平台坑，再把复杂业务状态机落到服务端，避免 UI 和媒体链路先行导致后续协议大改。
