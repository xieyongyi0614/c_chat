# 认证 API 使用说明

## 接口列表

### 1. 用户注册

**接口地址**: `POST /api/auth/register`

**请求体**:

```json
{
  "email": "user@example.com",
  "username": "用户名",
  "password": "password123",
  "phone": "13800138000", // 可选
  "gender": 1 // 可选，0-女, 1-男, 2-其他，默认2
}
```

**响应示例**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "username": "用户名",
    "role": 0
  }
}
```

**错误响应**:

- `409`: 邮箱或手机号已被注册
- `400`: 请求参数验证失败

### 2. 用户登录

**接口地址**: `POST /api/auth/login`

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "username": "用户名",
    "role": 0
  }
}
```

**错误响应**:

- `401`: 邮箱或密码错误，或账号已被禁用

### 3. 获取当前用户信息

**接口地址**: `GET /api/auth/profile`

**请求头**:

```
Authorization: Bearer {access_token}
```

**响应示例**:

```json
{
  "id": "clx1234567890",
  "email": "user@example.com",
  "nickname": "用户名",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**错误响应**:

- `401`: 未授权或 Token 无效

## 使用示例

### cURL 示例

#### 注册

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "测试用户",
    "password": "password123",
    "phone": "13800138000",
    "gender": 1
  }'
```

#### 登录

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### 获取用户信息

```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### JavaScript/TypeScript 示例

```typescript
// 注册
const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    username: '测试用户',
    password: 'password123',
    phone: '13800138000',
    gender: 1,
  }),
});

const registerData = await registerResponse.json();
const accessToken = registerData.access_token;

// 登录
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const loginData = await loginResponse.json();
const token = loginData.access_token;

// 获取用户信息
const profileResponse = await fetch('http://localhost:3001/api/auth/profile', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const profileData = await profileResponse.json();
console.log('用户信息:', profileData);
```

### 使用 Token 连接 Socket.IO

```typescript
import { io } from 'socket.io-client';

// 先登录获取 Token
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { access_token } = await loginResponse.json();

// 使用 Token 连接 Socket.IO
const socket = io('http://localhost:3001/chat', {
  auth: {
    token: access_token,
  },
});

socket.on('connect', () => {
  console.log('已连接到聊天服务器');
});
```

## 字段说明

### RegisterDto

- `email` (必填): 邮箱地址，必须符合邮箱格式
- `username` (必填): 用户名/昵称
- `password` (必填): 密码，至少6位
- `phone` (可选): 手机号，格式：1[3-9]xxxxxxxxx
- `gender` (可选): 性别，0-女, 1-男, 2-其他，默认2

### LoginDto

- `email` (必填): 邮箱地址
- `password` (必填): 密码

## 注意事项

1. **密码安全**: 密码在存储前会使用 bcrypt 进行哈希处理
2. **Token 有效期**: Token 有效期由 `JWT_EXPIRES_IN` 环境变量控制，默认7天
3. **账号状态**: 只有状态为 `0`（正常）的账号才能登录
4. **唯一性**: 邮箱和手机号在系统中必须唯一
5. **错误信息**: 为了安全，登录失败时统一返回"邮箱或密码错误"，不区分是邮箱不存在还是密码错误
