# Socket.IO IM 聊天服务 - 快速开始

## 安装依赖

依赖已自动安装，包括：

- `@nestjs/websockets`
- `@nestjs/platform-socket.io`
- `socket.io`

## 服务端配置

### 1. 模块已自动集成

`ChatModule` 已集成到 `AppModule` 中，无需额外配置。

### 2. 环境变量

确保 `.env` 文件中包含以下配置：

```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3001
```

### 3. 启动服务

```bash
pnpm start:dev
```

服务将在 `http://localhost:3001` 启动，Socket.IO 命名空间为 `/chat`。

## 客户端连接

### 基础连接

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

### 完整示例

```typescript
import { io } from 'socket.io-client';

// 1. 连接
const socket = io('http://localhost:3001/chat', {
  auth: { token: 'your-jwt-token' },
});

// 2. 监听连接
socket.on('connect', () => {
  console.log('已连接');

  // 3. 加入房间
  socket.emit('join_room', { room_id: 'room-123' });
});

// 4. 发送消息
socket.emit('send_message', {
  room_id: 'room-123',
  content: 'Hello!',
  type: 0,
});

// 5. 接收消息
socket.on('new_message', (message) => {
  console.log('新消息:', message);
});
```

## 核心功能

### ✅ 已实现功能

- [x] JWT Token 认证
- [x] 实时消息发送/接收
- [x] 加入/离开聊天室
- [x] 消息历史查询
- [x] 消息撤回
- [x] 正在输入状态
- [x] 用户在线状态管理
- [x] 私聊和群聊支持

### 📋 事件列表

#### 客户端发送

- `join_room` - 加入聊天室
- `leave_room` - 离开聊天室
- `send_message` - 发送消息
- `get_messages` - 获取消息历史
- `recall_message` - 撤回消息
- `mark_read` - 标记已读
- `typing` - 正在输入

#### 服务器推送

- `new_message` - 新消息
- `messages_history` - 消息历史
- `user_joined` - 用户加入
- `user_left` - 用户离开
- `user_typing` - 用户正在输入
- `message_recalled` - 消息已撤回
- `error` - 错误信息

## 测试连接

### 使用 Postman 或类似工具

1. 先通过 REST API 登录获取 JWT Token
2. 使用 WebSocket 连接到 `ws://localhost:3001/chat`
3. 在连接时传递 Token（通过 auth.token 或 query.token）

### 使用 Node.js 测试脚本

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: { token: 'your-jwt-token' },
});

socket.on('connect', () => {
  console.log('✅ 连接成功');

  // 测试发送消息
  socket.emit('send_message', {
    room_id: 'test-room',
    content: '测试消息',
    type: 0,
  });
});

socket.on('new_message', (msg) => {
  console.log('📨 收到消息:', msg);
});

socket.on('error', (err) => {
  console.error('❌ 错误:', err);
});
```

## 常见问题

### Q: 连接失败，提示认证失败？

A: 确保：

1. JWT Token 有效且未过期
2. Token 通过 `auth.token`、`query.token` 或 `Authorization` header 传递
3. `JWT_SECRET` 环境变量配置正确

### Q: 无法加入聊天室？

A: 确保：

1. 用户已在该聊天室的参与者列表中
2. 聊天室状态为正常（state = 0）
3. 用户状态为正常（state = 0）

### Q: 消息发送失败？

A: 确保：

1. 用户已加入该聊天室
2. 消息内容不为空
3. 消息类型正确（0-4）

## 下一步

- 查看 [README.md](./README.md) 了解详细文档
- 查看 [examples/client-example.ts](./examples/client-example.ts) 了解完整示例
- 根据业务需求扩展功能

## 支持

如有问题，请查看：

- Socket.IO 官方文档: https://socket.io/docs/
- NestJS WebSockets 文档: https://docs.nestjs.com/websockets/gateways
