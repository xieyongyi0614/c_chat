# Socket.IO IM 聊天服务

## 概述

这是一个基于 Socket.IO 的实时 IM 聊天服务，支持：

- JWT Token 认证
- 私聊和群聊
- 实时消息发送和接收
- 消息历史记录
- 消息撤回
- 正在输入状态
- 用户在线状态管理

## 架构设计

### 模块结构

```
src/chat/
├── chat.module.ts          # 聊天模块
├── gateways/
│   └── chat.gateway.ts     # Socket.IO 网关
├── services/
│   ├── message.service.ts  # 消息服务
│   └── chat-room.service.ts # 聊天室服务
└── dto/
    └── send-message.dto.ts # 数据传输对象
```

### 核心组件

1. **ChatGateway**: Socket.IO 网关，处理所有 WebSocket 连接和事件
2. **MessageService**: 处理消息的创建、查询、撤回等业务逻辑
3. **ChatRoomService**: 处理聊天室的创建、查询、用户管理等业务逻辑
4. **WsJwtAuthGuard**: WebSocket JWT 认证守卫

## 客户端连接

### 连接配置

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: {
    token: 'your-jwt-token', // 方式1: 通过 auth.token
  },
  // 或者
  query: {
    token: 'your-jwt-token', // 方式2: 通过 query.token
  },
  // 或者
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token', // 方式3: 通过 Authorization header
  },
});
```

### 连接事件

```typescript
// 连接成功
socket.on('connect', () => {
  console.log('已连接到服务器');
});

// 连接错误
socket.on('connect_error', (error) => {
  console.error('连接失败:', error);
});

// 断开连接
socket.on('disconnect', () => {
  console.log('已断开连接');
});
```

## Socket 事件

### 客户端发送事件

#### 1. 加入聊天室

```typescript
socket.emit('join_room', {
  room_id: 'room-id-123',
});
```

#### 2. 离开聊天室

```typescript
socket.emit('leave_room', {
  room_id: 'room-id-123',
});
```

#### 3. 发送消息

```typescript
socket.emit('send_message', {
  room_id: 'room-id-123',
  content: 'Hello, World!',
  type: 0, // 0：文本, 1：图片, 2：文件, 3：音频, 4：视频
});
```

#### 4. 获取消息历史

```typescript
socket.emit('get_messages', {
  room_id: 'room-id-123',
  page: 1, // 可选，默认 1
  page_size: 50, // 可选，默认 50
});
```

#### 5. 撤回消息

```typescript
socket.emit('recall_message', {
  message_id: 'message-id-123',
});
```

#### 6. 标记消息已读

```typescript
socket.emit('mark_read', {
  message_id: 'message-id-123',
});
```

#### 7. 正在输入

```typescript
// 开始输入
socket.emit('typing', {
  room_id: 'room-id-123',
  is_typing: 'true',
});

// 停止输入
socket.emit('typing', {
  room_id: 'room-id-123',
  is_typing: 'false',
});
```

### 服务器推送事件

#### 1. 新消息

```typescript
socket.on('new_message', (data) => {
  console.log('收到新消息:', data);
  // {
  //   id: 'message-id',
  //   room_id: 'room-id',
  //   sender_id: 'user-id',
  //   content: '消息内容',
  //   type: 0,
  //   is_read: 0,
  //   state: 0,
  //   create_time: '2024-01-01T00:00:00.000Z',
  //   user: {
  //     id: 'user-id',
  //     nickname: '用户昵称',
  //     avatar_url: '头像URL'
  //   }
  // }
});
```

#### 2. 消息历史

```typescript
socket.on('messages_history', (data) => {
  console.log('消息历史:', data);
  // {
  //   room_id: 'room-id',
  //   messages: [...],
  //   total: 100,
  //   page: 1,
  //   pageSize: 50
  // }
});
```

#### 3. 用户加入

```typescript
socket.on('user_joined', (data) => {
  console.log('用户加入:', data);
  // {
  //   room_id: 'room-id',
  //   user_id: 'user-id',
  //   message: '用户已加入聊天室'
  // }
});
```

#### 4. 用户离开

```typescript
socket.on('user_left', (data) => {
  console.log('用户离开:', data);
  // {
  //   room_id: 'room-id',
  //   user_id: 'user-id',
  //   message: '用户已离开聊天室'
  // }
});
```

#### 5. 用户正在输入

```typescript
socket.on('user_typing', (data) => {
  console.log('用户正在输入:', data);
  // {
  //   room_id: 'room-id',
  //   user_id: 'user-id',
  //   is_typing: true
  // }
});
```

#### 6. 消息已撤回

```typescript
socket.on('message_recalled', (data) => {
  console.log('消息已撤回:', data);
  // {
  //   message_id: 'message-id',
  //   room_id: 'room-id'
  // }
});
```

#### 7. 错误

```typescript
socket.on('error', (data) => {
  console.error('错误:', data);
  // {
  //   message: '错误信息'
  // }
});
```

## 完整示例

```typescript
import { io, Socket } from 'socket.io-client';

class ChatClient {
  private socket: Socket;

  constructor(serverUrl: string, token: string) {
    this.socket = io(`${serverUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('已连接到聊天服务器');
    });

    this.socket.on('disconnect', () => {
      console.log('已断开连接');
    });

    this.socket.on('new_message', (message) => {
      console.log('收到新消息:', message);
      // 处理新消息
    });

    this.socket.on('user_joined', (data) => {
      console.log('用户加入:', data);
    });

    this.socket.on('user_left', (data) => {
      console.log('用户离开:', data);
    });

    this.socket.on('user_typing', (data) => {
      console.log('用户正在输入:', data);
    });

    this.socket.on('error', (error) => {
      console.error('错误:', error);
    });
  }

  joinRoom(roomId: string) {
    this.socket.emit('join_room', { room_id: roomId });
  }

  leaveRoom(roomId: string) {
    this.socket.emit('leave_room', { room_id: roomId });
  }

  sendMessage(roomId: string, content: string, type: number = 0) {
    this.socket.emit('send_message', {
      room_id: roomId,
      content,
      type,
    });
  }

  getMessages(roomId: string, page: number = 1, pageSize: number = 50) {
    this.socket.emit('get_messages', {
      room_id: roomId,
      page,
      page_size: pageSize,
    });
  }

  recallMessage(messageId: string) {
    this.socket.emit('recall_message', { message_id: messageId });
  }

  markAsRead(messageId: string) {
    this.socket.emit('mark_read', { message_id: messageId });
  }

  typing(roomId: string, isTyping: boolean) {
    this.socket.emit('typing', {
      room_id: roomId,
      is_typing: isTyping.toString(),
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// 使用示例
const chatClient = new ChatClient('http://localhost:3001', 'your-jwt-token');

// 加入聊天室
chatClient.joinRoom('room-id-123');

// 发送消息
chatClient.sendMessage('room-id-123', 'Hello, World!');

// 获取消息历史
chatClient.getMessages('room-id-123', 1, 50);

// 监听消息历史响应
chatClient.socket.on('messages_history', (data) => {
  console.log('消息历史:', data.messages);
});
```

## 认证流程

1. 客户端通过 REST API 登录获取 JWT Token
2. 连接 Socket.IO 时在 `auth.token`、`query.token` 或 `Authorization` header 中携带 Token
3. `WsJwtAuthGuard` 自动验证 Token
4. 验证成功后，用户信息会被附加到 `socket.data.user` 上
5. 所有需要认证的事件都会自动验证用户身份

## 消息类型

- `0`: 文本消息
- `1`: 图片消息
- `2`: 文件消息
- `3`: 音频消息
- `4`: 视频消息

## 聊天室类型

- `0`: 私聊（一对一）
- `1`: 群聊（多对多）

## 注意事项

1. **Token 验证**: 所有 Socket.IO 事件都需要通过 JWT Token 认证
2. **房间权限**: 用户只能加入自己所在的聊天室
3. **消息状态**:
   - `0`: 正常
   - `-1`: 已删除
   - `-2`: 已撤回
   - `1`: 已编辑
4. **连接管理**: 系统会自动管理用户的连接状态和房间加入
5. **CORS 配置**: 生产环境需要配置正确的 CORS 域名

## 扩展功能建议

- [ ] 消息编辑功能
- [ ] 消息转发功能
- [ ] 文件上传和下载
- [ ] 语音/视频通话
- [ ] 消息搜索
- [ ] 消息推送通知
- [ ] 在线状态管理
- [ ] 消息已读回执
