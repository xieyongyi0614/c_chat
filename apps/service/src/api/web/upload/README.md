# 文件上传模块

## 功能特性

- ✅ 单文件上传
- ✅ 批量文件上传（最多 10 个文件）
- ✅ 图片自动压缩和优化
- ✅ 文件类型验证
- ✅ 文件大小限制（10MB）
- ✅ 文件列表查询
- ✅ 文件删除
- ✅ 权限控制（用户只能管理自己的文件，管理员可以管理所有文件）

## 支持的文件类型

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

## API 接口

### 1. 单文件上传

```http
POST /api/admin/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <file>
description: <string> (可选)
alt: <string> (可选)
```

**响应示例：**

```json
{
  "id": "clx123456789",
  "filename": "uuid-generated-filename.jpg",
  "originalName": "original-filename.jpg",
  "mimeType": "image/jpeg",
  "size": 1024000,
  "path": "./uploads/uuid-generated-filename.jpg",
  "url": "http://localhost:3001/uploads/uuid-generated-filename.jpg",
  "alt": "图片描述",
  "description": "文件描述",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. 批量文件上传

```http
POST /api/admin/upload/batch
Content-Type: multipart/form-data
Authorization: Bearer <token>

files: <file1>, <file2>, <file3>
description: <string> (可选)
alt: <string> (可选)
```

**响应示例：**

```json
{
  "success": [
    {
      "id": "clx123456789",
      "filename": "uuid-generated-filename1.jpg",
      "originalName": "original-filename1.jpg",
      "mimeType": "image/jpeg",
      "size": 1024000,
      "path": "./uploads/uuid-generated-filename1.jpg",
      "url": "http://localhost:3001/uploads/uuid-generated-filename1.jpg",
      "alt": "图片描述",
      "description": "文件描述",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "failed": [
    {
      "filename": "invalid-file.txt",
      "error": "不支持的文件类型: text/plain"
    }
  ],
  "total": 2,
  "successCount": 1,
  "failedCount": 1
}
```

### 3. 获取文件列表

```http
GET /api/admin/upload?page=1&limit=10&search=keyword&mimeType=image/jpeg
Authorization: Bearer <token>
```

**查询参数：**

- `page`: 页码（默认：1）
- `limit`: 每页数量（默认：10，最大：100）
- `search`: 搜索关键词（可选）
- `mimeType`: 文件类型过滤（可选）

**响应示例：**

```json
{
  "files": [
    {
      "id": "clx123456789",
      "filename": "uuid-generated-filename.jpg",
      "originalName": "original-filename.jpg",
      "mimeType": "image/jpeg",
      "size": 1024000,
      "path": "./uploads/uuid-generated-filename.jpg",
      "url": "http://localhost:3001/uploads/uuid-generated-filename.jpg",
      "alt": "图片描述",
      "description": "文件描述",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "uploader": {
        "id": "user123",
        "username": "admin",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 4. 获取所有文件列表（管理员）

```http
GET /api/admin/upload/all?page=1&limit=10&search=keyword&mimeType=image/jpeg
Authorization: Bearer <admin-token>
```

### 5. 删除文件

```http
DELETE /api/admin/upload/{fileId}
Authorization: Bearer <token>
```

**响应示例：**

```json
{
  "message": "文件删除成功"
}
```

## 环境配置

在 `.env` 文件中配置以下参数：

```env
# 文件上传配置
UPLOAD_PATH=./uploads
BASE_URL=http://localhost:3001
MAX_FILE_SIZE=10485760  # 10MB
```

## 目录结构

```
apps/service/
├── src/
│   └── api/
│       └── admin/
│           └── upload/
│               ├── dto/
│               │   └── upload.dto.ts
│               ├── upload.controller.ts
│               ├── upload.service.ts
│               ├── index.ts
│               └── README.md
└── uploads/  # 上传文件存储目录
```

## 使用示例

### 前端上传示例（使用 FormData）

```javascript
// 单文件上传
const uploadSingleFile = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('description', '文件描述');
  formData.append('alt', '图片alt属性');

  const response = await fetch('/api/admin/upload/single', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};

// 批量文件上传
const uploadMultipleFiles = async (files, token) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('description', '批量上传描述');

  const response = await fetch('/api/admin/upload/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};
```

## 注意事项

1. 所有接口都需要 JWT 认证
2. 普通用户只能查看和管理自己上传的文件
3. 管理员可以查看和管理所有文件
4. 上传的文件会自动压缩优化（仅图片文件）
5. 文件通过 UUID 重命名，避免文件名冲突
6. 删除文件时会同时删除物理文件和数据库记录
7. 静态文件通过 `/uploads/` 路径访问
