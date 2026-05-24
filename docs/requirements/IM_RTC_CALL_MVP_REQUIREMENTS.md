# IM 音视频通话 MVP 需求分析与任务编排

## 背景

当前系统已经具备单聊消息、WebSocket 实时通信、多窗口登录、文件上传、音频消息 waveform 和本地消息存储能力。新增音视频通话后，系统会从“消息型 IM”进入“实时媒体型 IM”。如果一期目标不收窄，很容易把 P2P、SFU、屏幕共享、设备管理、多窗口同步、通话记录和弱网恢复混在一起，最后没有一个能稳定上线的最小闭环。

本文件只定义最低可用版本，目标是先把 1v1 音视频通话做成可验证、可恢复、可维护的闭环，再为后续 SFU、多人人通话和屏幕共享预留扩展位。

## MVP 目标

一期只做下面这些能力：

- 单人语音通话。
- 单人视频通话。
- 来电提醒。
- 接听、拒接、取消、挂断。
- 忙线判断。
- 通话超时。
- 麦克风静音。
- 摄像头开关。
- 基础音频输出设备切换。
- 基础 ICE candidate 同步。
- 一次基础 ICE restart。
- TURN 接入。
- 多窗口通话状态同步。
- 通话记录落库。

## 非 MVP 范围

一期不做：

- 多人通话。
- SFU。
- 屏幕共享。
- 通话录制。
- 实时字幕和转写。
- 复杂质量面板。
- 企业级设备管理。
- 全局快捷键的完整可配置体系。

## 当前基础

### 已有能力

- WebSocket 已可作为 signaling 入口。
- protobuf 和 shared packages 已存在，适合继续承载 call 协议。
- Electron 已支持多窗口登录和 IPC。
- React + Zustand 已可承载通话状态和 overlay UI。
- NestJS + Prisma + MySQL 已可承载 call session、participant 和 history。

### 主要缺口

- 缺少通话协议和状态机。
- 缺少 WebRTC 连接管理。
- 缺少 TURN 部署和鉴权。
- 缺少来电窗口和通话中悬浮窗。
- 缺少多窗口状态同步。
- 缺少通话记录数据模型。

## 整体系统架构

### 1. Electron 原生层

- 负责系统通知、来电弹窗、悬浮窗、设备权限、窗口控制和多窗口广播。
- 只暴露受控 IPC，不直接承载通话业务。

### 2. React 通话层

- 负责来电 UI、通话中 UI、设备选择、静音、挂断和错误提示。
- 通过 Zustand 订阅通话状态。

### 3. Client Call Core

- `CallManager` 负责通话业务状态。
- `RTCManager` 负责 WebRTC 媒体连接。
- 两者严格分层，避免把 signaling 和媒体逻辑混在一起。

### 4. Signaling Server

- 复用 NestJS WebSocket Gateway。
- 负责鉴权、路由、状态裁决、超时和幂等。
- 只转发 SDP、ICE candidate 和 call control event。

### 5. RTC Infrastructure

- 一期只使用 P2P WebRTC + STUN/TURN。
- 不引入 SFU。

## 技术选型建议

### WebRTC

WebRTC 适合 MVP。它可以直接支撑桌面端音视频采集、编码、NAT 穿透、加密传输和设备切换。

### P2P 与 TURN

MVP 必须上 TURN。只靠 STUN 的 P2P 在复杂 NAT、企业网和校园网下失败率太高，桌面 IM 不能接受“部分网络打不通”。

建议使用 coturn，支持 UDP、TCP 和 TLS 443。

### codec

- 音频优先 Opus。
- 视频先用 Chromium 默认能力，不强行做复杂 codec 策略。

### Electron 注意点

- 摄像头、麦克风、屏幕录制权限在不同系统上表现不同。
- 多窗口不能都持有 RTC，必须只有一个主窗口是 owner。
- 窗口关闭、刷新、崩溃、休眠都可能导致连接断开。

## 模块拆分

### apps/service

- `api/call`
  - 通话历史、TURN credentials。
- `call.service.ts`
  - 通话会话、参与者、忙线、记录。
- `call.gateway.ts`
  - signaling 消息分发。
- `call-timeout.service.ts`
  - 超时处理。

### packages/shared-protobuf

- 新增独立 `Call.proto`。
- 不建议塞进 `Chat.proto`，避免聊天协议继续膨胀。

### packages/shared-types

- 通话状态、设备状态、IPC 类型、TURN credential 类型。

### apps/electron_client

- `ipc/api/callIpc.ts`
- `main/windows/callWindow`
- `main/call/callStateBridge`

### apps/frontend

- `pages/chats/.../_components/call`
- `lib/call`
- `callStore`

## 通话流程时序

### 发起通话

1. 用户在单聊页面点击语音或视频。
2. 前端发送 `CallInvite`。
3. 服务端校验会话关系和忙线状态。
4. 服务端创建 `call_session` 和 `call_participant`。
5. 服务端推送 `CallIncoming`。
6. 被叫接听后发送 `CallAccept`。
7. 双方交换 SDP 和 ICE candidate。
8. WebRTC connected 后进入通话中状态。

### 拒接

1. 被叫点击拒接。
2. 服务端标记 `rejected`。
3. 双方清理资源并落通话记录。

### 超时

1. 服务端创建 session 后启动超时。
2. 被叫未接听则标记 `timeout`。
3. 广播结束状态，前端停止铃声并关闭来电窗。

### 挂断

1. 任一方发送 `CallHangup`。
2. 服务端幂等结束 session。
3. 双方停止 tracks，关闭 peer connection。

### ICE 重连

1. 监听 `iceconnectionstatechange`。
2. 进入 `reconnecting`。
3. 尝试一次 ICE restart。
4. 失败后结束通话并提示网络异常。

## 状态机设计

### CallSession 状态

- `idle`
- `inviting`
- `ringing_incoming`
- `ringing_outgoing`
- `accepted`
- `connecting`
- `in_call`
- `reconnecting`
- `ending`
- `ended`
- `rejected`
- `cancelled`
- `timeout`
- `busy`
- `failed`

### 关键约束

- 同一用户同一时间只允许一个活跃通话。
- `ended/rejected/cancelled/timeout/failed` 为终态。
- SDP 和 ICE 只在 `accepted/connecting/in_call/reconnecting` 中处理。
- 忙线判断以服务端为准。

## 数据库设计建议

### call_session

- `id`
- `conversation_id`
- `call_type`
- `initiator_id`
- `state`
- `start_at`
- `accepted_at`
- `connected_at`
- `ended_at`
- `duration`
- `end_reason`
- `created_at`
- `updated_at`

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
- `network_state`
- `last_seen_at`

### call_history

- `id`
- `call_id`
- `conversation_id`
- `user_id`
- `peer_user_id`
- `direction`
- `call_type`
- `result`
- `duration`
- `started_at`
- `ended_at`

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

### 设备消息

- `CallDeviceStateUpdate`
- `CallMuteAudioUpdate`
- `CallCameraStateUpdate`
- `CallNetworkStateUpdate`

## 安全性

- Electron 保持 `contextIsolation`。
- preload 只暴露白名单 IPC。
- signaling 必须鉴权。
- TURN 使用短期凭证。
- SDP 和 ICE candidate 不写普通业务日志。

## 风险点

- P2P 在复杂 NAT 下失败率高，所以 TURN 必须存在。
- 如果状态机不清晰，拒接、取消、超时和挂断会乱序。
- 多窗口如果都能操作 RTC，会出现重复响铃和状态抢占。
- ICE restart 和 WebSocket reconnect 必须分开处理。

## MVP 开发编排

### 阶段 0：技术验证

- [x] 验证 Electron + WebRTC 基础可用边界。
- [ ] 验证 getUserMedia、device 枚举和权限。
- [ ] 部署 coturn。
- [ ] 验证 TURN 中继。
- [x] 验证单个 RTC owner window 策略。

### 阶段 1：协议和状态机

- [x] 定义 call protobuf。
- [x] 定义 call session 状态机。
- [x] 定义 busy、timeout、reject、cancel、hangup 幂等规则。
- [x] 定义 SDP/ICE 消息流。

### 阶段 2：服务端 signaling

- [ ] 新增 call 数据模型。
- [ ] 实现 CallGateway。
- [ ] 实现 CallService。
- [ ] 实现 timeout 和 busy。
- [ ] 实现 TURN credential API。

### 阶段 3：客户端 CallManager

- [ ] 新增 call store。
- [ ] 实现 CallManager。
- [ ] 接入 WebSocket call 事件。
- [ ] 接入 Electron 多窗口广播。
- [ ] 实现来电铃声和来电弹窗。

### 阶段 4：RTCManager

- [ ] 实现本地采集。
- [ ] 实现 RTCPeerConnection。
- [ ] 实现 SDP offer/answer。
- [ ] 实现 ICE candidate 同步。
- [ ] 实现静音、摄像头开关和设备切换。

### 阶段 5：桌面体验

- [ ] 原生通知。
- [ ] 系统级来电窗口。
- [ ] mini floating window。
- [ ] 多窗口状态同步。

## 推荐开发顺序

1. 先做 WebRTC + TURN 技术验证。
2. 再定 protobuf、状态机和数据模型。
3. 然后做服务端 signaling 闭环。
4. 接着做前端 CallManager。
5. 再接 RTCManager，完成真实 1v1 音视频。
6. 最后补桌面体验和弱网细节。
