# IM 音视频通话阶段 0 技术验证记录

## 目标

阶段 0 不进入完整业务实现，只确认 MVP 能否沿用 Electron + React + NestJS + WebSocket + protobuf 的现有链路落地。

## 已确认的工程边界

- 通话信令继续复用现有 WebSocket `Command` 封装。
- 通话协议通过 `packages/shared-protobuf/src/static/Call.proto` 独立定义。
- 通话事件继续通过 `packages/shared-protobuf/src/protoMap.ts` 映射。
- 通话业务状态机沉淀到 `packages/shared-types/src/lib/call/call-state.ts`，前端和服务端后续复用同一套状态语义。
- MVP 只做 P2P WebRTC + STUN/TURN，不引入 SFU。
- 多窗口策略采用单 RTC owner window，其余窗口只同步状态。

## 待真实环境验证

- Windows/macOS 麦克风权限。
- Windows/macOS 摄像头权限。
- Electron `enumerateDevices` 在授权前后的 label 行为。
- Electron 音频输出设备切换能力。
- coturn UDP/TCP/TLS 443 中继。
- 对称 NAT 或企业网络下 TURN 成功率。
- 窗口关闭、刷新、休眠唤醒后的 RTC owner 清理。

## TURN 测试环境建议

- 使用 coturn。
- 域名建议：`turn.<domain>`。
- 支持：
  - UDP 3478
  - TCP 3478
  - TLS 443
- 使用短期凭证，不在客户端写死用户名和密码。
- TURN credential 后续由服务端按登录用户和 call session 签发。

## 阶段 0 验收口径

阶段 0 的工程验收是：

- 已明确 MVP 媒体架构为 P2P + TURN。
- 已明确协议文件和事件映射位置。
- 已明确状态机共享位置。
- 已明确单 RTC owner window 策略。
- 已列出必须人工验证的桌面和网络能力。

阶段 0 的真实环境验收仍需要在有摄像头、麦克风、TURN 节点和复杂网络的环境里手动补跑。
