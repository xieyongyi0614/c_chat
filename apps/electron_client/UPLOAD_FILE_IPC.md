# Electron 文件上传 IPC 说明

## 目标流程

Renderer（React）
↳ 触发 IPC 调用
Preload（桥接）
↳ 将调用代理到主进程
Main（Electron 主进程）
↳ 打开文件对话框
↳ 读取文件并分片
↳ 通过 HTTP 上传分片到 NestJS
NestJS（后端）
↳ 接收分片
↳ 持久化到磁盘 / OSS

## Electron 端实现

### 主进程入口

主进程通过 `apps/electron_client/src/preload/index.ts` 将 IPC 桥接函数暴露到渲染层：

- `window.c_chat.ipcCall(message)`

其中 `message` 格式为:

```ts
{
  method: string;
  params: any[];
  id: string;
  windowId?: number;
  webContentId?: number;
}
```

### 新增 IPC 方法

在 `apps/electron_client/src/ipc/api/upload.ts` 中新增：

- `SelectUploadFiles`：打开系统文件选择器
- `UploadFileByChunks`：读取本地文件并按 `chunkSize` 分片上传

### 主要逻辑

1. `SelectUploadFiles`
   - 调用 `electron.dialog.showOpenDialog`
   - 返回文件路径数组 `string[]`
2. `UploadFileByChunks`
   - 使用 `fs.createReadStream(filePath)` 读取文件
   - 按 `chunkSize` 分片
   - 每个分片使用 `fetch` + `FormData` POST 到后端 `http://localhost:3001/api/upload/chunk`
   - 传递 `uploadId`、`fileName`、`chunkIndex`、`totalChunks` 等元数据

## NestJS 端实现

在 `c_chat_service/src/api/web/upload/upload.controller.ts` 中新增 `POST /upload/chunk` 接口。

后端通过 `UploadService.uploadChunk(...)`：

- 将每个分片追加到临时文件
- 当最后一个分片上传完成时，将完整文件组装并保存到磁盘
- 生成文件 URL 和数据库记录

## React 调用示例

在渲染进程中，通过 `window.c_chat.ipcCall` 调用：

```ts
const message = {
  method: 'SelectUploadFiles',
  params: [{ allowMultiSelect: false }],
  id: `select_${Date.now()}`,
};
const selectedPaths = await window.c_chat.ipcCall(message);

const uploadMessage = {
  method: 'UploadFileByChunks',
  params: [{ filePath: selectedPaths[0], chunkSize: 2 * 1024 * 1024 }],
  id: `upload_${Date.now()}`,
};
const result = await window.c_chat.ipcCall(uploadMessage);
```

## 注意事项

- `window.c_chat` 需要在 Electron preload 中注入
- 后端 `upload/chunk` 接口已加入 JWT 鉴权，Electron 主进程需要携带 `Authorization: Bearer <token>`
- 分片大小建议 2~4 MB
- 如果需要 OSS 上传，可在后端保存到本地后同步到 OSS，或者将 `UploadService` 扩展为直接写入 OSS
