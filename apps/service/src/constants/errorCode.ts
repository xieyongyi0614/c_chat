export const SOCKET_ERROR_CODE = {
  // --- 通用/连接层 (1000-1999) ---
  // NORMAL_CLOSURE: 1000, // 正常关闭
  // GOING_AWAY: 1001, // 端点离开（如服务器重启、页面跳转）
  // PROTOCOL_ERROR: 1002, // 协议错误
  // UNSUPPORTED_DATA: 1003, // 不支持的数据类型
  // ABNORMAL_CLOSURE: 1006, // 异常关闭（无关闭帧收到，通常是网络断了）
  // INVALID_PAYLOAD: 1007, // 负载数据无效
  // POLICY_VIOLATION: 1008, // 违反策略
  // MESSAGE_TOO_BIG: 1009, // 消息过大
  INTERNAL_ERROR: 1011, // 服务器内部错误
  // SERVICE_RESTART: 1012, // 服务重启
  // TRY_AGAIN_LATER: 1013, // 稍后重试（由于临时过载）

  // --- 认证与授权 (2000-2999) ---
  UNAUTHORIZED: 2001, // 未认证（Token缺失或过期）
  // FORBIDDEN: 2003, // 禁止访问（权限不足）
  // KICKED_OUT: 2004, // 被踢出（如在其他地方登录）
  // SESSION_EXPIRED: 2005, // 会话过期

  // // --- 业务逻辑错误 (3000-3999) ---
  // ROOM_NOT_FOUND: 3001, // 房间/频道不存在
  // ROOM_FULL: 3002, // 房间已满
  // RATE_LIMIT_EXCEEDED: 3003, // 发送频率过快（限流）
  // BANNED_USER: 3004, // 用户已被禁言或封禁
  // INVALID_EVENT: 3005, // 非法的事件名称
  // RESOURCE_NOT_FOUND: 3006, // 请求的资源不存在

  // // --- 客户端/自定义错误 (4000-4999) ---
  // CLIENT_PARSE_ERROR: 4001, // 客户端解析数据失败
  // CLIENT_NETWORK_OFFLINE: 4002, // 客户端网络断开

  // --- 连接阶段特有错误 (5000-5999) ---
  // CONNECTION_REFUSED: 5001, // 连接被拒绝（通常是服务端主动断开）
  // TRANSPORT_ERROR: 5002, // 传输层错误（如网络波动、CORS 问题）
  // SERVER_OVERLOADED: 5003, // 服务器过载（拒绝新连接）
  // NAMESPACE_NOT_FOUND: 5004, // 命名空间不存在
  // INVALID_HANDSHAKE: 5005, // 握手参数无效
  // MIDDLEWARE_ERROR: 5006, // 服务端中间件报错（如数据库连不上）

  /** 未知错误，什么错误都可以使用，统一处理使用errorMessage提示 */
  UNKNOWN: 10001,
} as const;

// 导出类型，方便 TS 类型检查
export type SocketErrorCode = (typeof SOCKET_ERROR_CODE)[keyof typeof SOCKET_ERROR_CODE];
