# 媒体上传需求分析与任务编排

## 背景

c_chat IM monorepo 正在将 Electron 桌面端一比一复刻到 Web(Next.js)。桌面端媒体上传由主进程本地调度分片,依赖本地文件路径和 IPC 通信;Web 端无主进程、无本地文件路径,需基于浏览器 File API 重建上传链路。

桌面端上传链路采用 **方案 B**:上传完成后服务端直接创建 File/Media/MessageHistory 并推送 `newUpdateMessage` 和 `sendFileUploadComplete`,客户端不二次调用 `sendMessage`。Web 端需沿用此方案,保持前后端协议一致。

参考文档:`../requirements/MEDIA_UPLOAD_REQUIREMENTS.md`

## 当前桌面端实现

### 上传端点

桌面端通过以下四个端点完成分片上传:

- **`/upload/init`** — 初始化上传会话,入参包含 `client_msg_id`、`conversation_id`、`file_name`、`file_size`、`mime_type`、`sample_hash`、`content_hash`、`chunk_size`、`total_chunks`、`message_type`、`content`、`duration`、`waveform` 等消息上下文,返回 `uploadSessionId`
- **`/upload/chunk`** — 上传分片,幂等,已存在的 chunk 不重复计数
- **`/upload/status`** — 查询已落盘分片,用于断点续传,从数据库返回已上传分片列表
- **`/upload/complete`** — 完成上传,服务端 merge chunk、创建 File/Media/MessageHistory 并推送 `newUpdateMessage` 和 `sendFileUploadComplete`

### 本地任务表

桌面端使用 SQLite 表 `upload_task` 记录上传任务,对应类型 `LocalUploadTaskListItem`,字段包括:

- `id` — 任务唯一标识
- `clientMsgId` — 客户端消息 ID
- `filePath` — 本地文件路径
- `fileName` — 文件名
- `fileSize` — 文件大小(字节)
- `mimeType` — MIME 类型
- `fileHash` — 文件完整 hash
- `fileId` — 服务端文件 ID(上传成功后)
- `status` — 上传状态(UploadStatus 枚举)
- `progress` — 上传进度(0-100)
- `uploadedBytes` — 已上传字节数
- `isRunning` — 是否正在运行
- `uploadSessionId` — 服务端上传会话 ID
- `windowId` — 发起上传的渲染进程窗口 ID
- `chunkSize` — 分片大小
- `uploadedChunks` — 已上传分片数
- `totalChunks` — 总分片数
- `isInstant` — 是否秒传
- `errorMessage` — 错误信息
- `createTime` — 创建时间
- `updateTime` — 更新时间

### 上传状态枚举

```typescript
UploadStatus = {
  waiting: 0, // 等待队列
  hashing: 1, // 计算 hash
  uploading: 2, // 上传中
  success: 3, // 成功
  fail: -1, // 失败
  paused: -2, // 暂停
};
```

### 上传调度器

桌面端上传调度器位于 `apps/electron_client/src/utils/axios/fileOps/`,支持:

- 并发分片上传
- 断线恢复(通过 `/upload/status` 查询已落盘分片)
- 任务队列管理
- 进度实时更新

### 上传完成流程

采用方案 B:

1. 客户端调用 `/upload/complete`
2. 服务端 merge chunk、创建 File、创建 Media、创建 MessageHistory
3. 服务端推送 `newUpdateMessage` 和 `sendFileUploadComplete`
4. 客户端接收推送,更新本地消息状态
5. **客户端不再二次调用 `sendMessage`**

### 文件选择 IPC

桌面端通过 IPC 调用主进程文件选择器:

- **`SelectFiles`** — 选择文件,参数 `SelectFilesParams: { filters?, allowMultiSelect? }`,返回 `FileInfoListItem[]`
- **`ReadLocalFile`** — 读取本地文件,参数 `ReadLocalFileParams: { path: string }`,返回 `ArrayBuffer`

`FileInfoListItem` 字段:

- `id` — 文件唯一标识
- `filePath` — 本地文件路径
- `fileName` — 文件名
- `fileSize` — 文件大小
- `fileType` — 文件类型枚举
- `mimeType` — MIME 类型
- `extension` — 文件扩展名
- `lastModified` — 最后修改时间
- `isDirectory` — 是否目录
- `isFile` — 是否文件
- `url` — 可选,文件 URL
- `metadata` — 可选,文件元数据(如音频 duration、waveform)

桌面端实现位置:

- 上传调度:`apps/electron_client/src/utils/axios/fileOps/`
- 本地任务表:`apps/electron_client/src/db/table/UploadTaskTable.ts`
- IPC:`apps/electron_client/src/ipc/api/fileOperationIpc.ts`

## Web 端目标

Web 端需复刻桌面端上传能力,包括:

- 分片上传
- 秒传(init 阶段命中可复用文件)
- 断点续传(刷新/断线后从服务端已落盘分片续传)
- 进度实时展示
- 失败重试

关键差异:

- 文件来源从本地文件路径改为浏览器 File API
- 本地任务表从 SQLite 改为 IndexedDB
- 无主进程调度,改为浏览器内 Worker 或主线程调度
- 沿用方案 B,客户端不二次发消息

## 产品需求与验收

### 文件选择

用户通过 `<input type="file">` 或拖拽选择文件,得到 File 对象。

验收标准:

- 支持 `<input type="file">` 选择文件
- 支持拖拽文件到聊天窗口
- 支持多选文件
- 从 File 对象生成等价 `FileInfoListItem`(无 `filePath`,使用 File/Blob 对象)
- 支持读取文件元数据(图片宽高、音频 duration/waveform、视频时长)
- 文件选择后立即展示预览和上传确认 UI

### 分片上传

File 对象按 `chunkSize` 切片,逐片上传到 `/upload/chunk`。

验收标准:

- File 对象按固定 `chunkSize`(如 1MB)切片
- 调用 `/upload/chunk` 上传每个分片
- `/upload/chunk` 幂等,已存在 chunk 不重复计数
- 支持并发上传多个分片(如 3 个并发)
- 进度持续可见,实时更新 `uploadedChunks` 和 `uploadedBytes`
- 分片上传失败后支持重试单个分片

### 秒传

init 阶段命中可复用文件时,直接进入成功态,不进完整 chunk 流程。

验收标准:

- `/upload/init` 返回秒传标识时,直接标记任务为 `success`
- 不进入分片上传流程
- 本地 pending 消息被服务端结果覆盖
- 秒传成功后展示"秒传成功"提示

### 断点续传

刷新页面或断线后,从 IndexedDB 恢复任务,调用 `/upload/status` 查询服务端已落盘分片,续传未完成分片。

验收标准:

- 刷新页面后从 IndexedDB 恢复未完成任务
- 调用 `/upload/status` 查询服务端已落盘分片
- 只上传未落盘的分片
- 断线重连后自动续传
- 续传时进度从已上传分片开始计算

### 上传完成建消息

complete 后服务端建消息并推送 `newUpdateMessage`,客户端不二次 `sendMessage`。

验收标准:

- 调用 `/upload/complete` 完成上传
- 服务端创建 File、Media、MessageHistory
- 服务端推送 `newUpdateMessage` 和 `sendFileUploadComplete`
- 客户端接收推送,更新本地消息状态
- 本地 pending 消息被服务端结果覆盖
- **客户端不再二次调用 `sendMessage`**

### 失败与重试

上传失败时明确失败原因,提供重试入口。

验收标准:

- 分片上传失败时展示具体错误信息
- complete 失败时展示具体错误信息
- 失败消息展示"重试"按钮
- 点击重试后从断点续传
- 网络错误自动重试(最多 3 次)
- 服务端错误(如 session 过期)提示用户重新上传

## Web 适配要点

### 文件来源适配

桌面端:

- `SelectFiles` IPC 返回 `FileInfoListItem[]`,包含 `filePath`
- `ReadLocalFile` IPC 读取本地文件路径,返回 `ArrayBuffer`

Web 端:

- `<input type="file">` 或拖拽得到 `File` 对象
- File 对象直接提供 `name`、`size`、`type`、`lastModified`
- 使用 `FileReader` 或 `File.arrayBuffer()` 读取文件内容
- 生成等价 `FileInfoListItem`,`filePath` 字段留空或使用 `File.name`
- 使用 `URL.createObjectURL(file)` 生成临时 URL 用于预览

### 本地任务表适配

桌面端:

- SQLite 表 `upload_task`
- 主进程管理任务生命周期

Web 端:

- IndexedDB store `upload_tasks`
- 字段与 `LocalUploadTaskListItem` 保持一致
- 以 `clientMsgId`、`uploadSessionId`、`conversationId` 关联任务与消息
- 关闭标签页后任务状态持久化到 IndexedDB

### 分片上传适配

桌面端:

- 主进程调度分片上传
- 使用 Node.js `fs` 读取文件分片

Web 端:

- 浏览器主线程或 Web Worker 调度分片上传
- 使用 `File.slice(start, end)` 切片
- 使用 `fetch` 或 `Axios` 上传分片
- 支持并发上传(如 3 个并发)

### 断点续传适配

桌面端:

- 冷启动时从 SQLite 恢复任务
- 调用 `/upload/status` 查询已落盘分片

Web 端:

- 刷新页面时从 IndexedDB 恢复任务
- 调用 `/upload/status` 查询已落盘分片
- **注意**:File 对象无法持久化到 IndexedDB,刷新后需重新选择文件或依赖服务端已传分片续传
- 建议:未完成任务在刷新后提示用户"上传未完成,是否继续?",用户重新选择文件后从断点续传

### 上传完成适配

桌面端和 Web 端一致,均采用方案 B:

- 客户端调用 `/upload/complete`
- 服务端创建消息并推送
- 客户端不二次 `sendMessage`

## 任务拆分

### 客户端任务

- [ ] 实现 File 选择(input + 拖拽)
- [ ] 从 File 对象组装 `FileInfoListItem`(无 `filePath`,使用 File 对象)
- [ ] 实现文件元数据读取(图片宽高、音频 duration/waveform)
- [ ] 实现 File 分片切割(`File.slice`)
- [ ] 实现并发分片上传(fetch/Axios)
- [ ] 调用 `/upload/init`,传入消息上下文
- [ ] 调用 `/upload/chunk`,上传分片
- [ ] 调用 `/upload/status`,查询已落盘分片
- [ ] 调用 `/upload/complete`,完成上传
- [ ] 实现秒传分支(init 返回秒传标识时跳过 chunk 流程)
- [ ] 实现 IndexedDB 任务表(store `upload_tasks`)
- [ ] 实现任务恢复(刷新页面后从 IndexedDB 恢复)
- [ ] 实现进度 UI(实时更新 `uploadedChunks`、`uploadedBytes`、`progress`)
- [ ] 实现失败重试 UI(展示错误信息 + 重试按钮)
- [ ] 去掉二次发消息逻辑(对齐方案 B)
- [ ] 接收 `newUpdateMessage` 和 `sendFileUploadComplete`,更新本地消息状态

## 阶段编排

### 阶段 0:上传/消息/媒体职责边界确认

目标:确认 Web 端沿用方案 B,客户端不二次发消息。

- [ ] 确认 Web 端沿用方案 B
- [ ] 确认 `/upload/init` 入参包含消息上下文
- [ ] 确认 `/upload/complete` 后服务端直接创建消息
- [ ] 确认客户端不再二次调用 `sendMessage`
- [ ] 确认 `newUpdateMessage` 和 `sendFileUploadComplete` 推送结构

产出:

- 上传链路职责边界清晰,前后端协议一致

### 阶段 1:File 选择 + 分片 + init/chunk

目标:能上传一张图片。

- [ ] 实现 `<input type="file">` 选择文件
- [ ] 实现拖拽文件到聊天窗口
- [ ] 从 File 对象组装 `FileInfoListItem`
- [ ] 实现 File 分片切割
- [ ] 调用 `/upload/init`,返回 `uploadSessionId`
- [ ] 调用 `/upload/chunk`,上传分片
- [ ] 实现并发分片上传
- [ ] 实现进度 UI

产出:

- 能选择文件并上传一张图片,进度可见

### 阶段 2:status 续传 + complete 建消息

目标:上传完成后服务端建消息,客户端不二次发消息。

- [ ] 调用 `/upload/status`,查询已落盘分片
- [ ] 实现断点续传(只上传未落盘分片)
- [ ] 调用 `/upload/complete`,完成上传
- [ ] 接收 `newUpdateMessage` 和 `sendFileUploadComplete`
- [ ] 更新本地消息状态(pending → success)
- [ ] 去掉二次发消息逻辑

产出:

- 上传完成后服务端建消息,客户端只负责展示

### 阶段 3:秒传

目标:init 命中可复用文件时直接成功。

- [ ] 实现秒传分支(init 返回秒传标识时跳过 chunk 流程)
- [ ] 秒传成功后直接标记任务为 `success`
- [ ] 秒传成功后展示"秒传成功"提示

产出:

- 秒传场景能直接得到成功态

### 阶段 4:任务恢复 + 失败重试 + 体验

目标:刷新页面后任务可恢复,失败后可重试。

- [ ] 实现 IndexedDB 任务表
- [ ] 刷新页面后从 IndexedDB 恢复任务
- [ ] 提示用户重新选择文件(File 对象无法持久化)
- [ ] 实现失败重试 UI
- [ ] 实现网络错误自动重试(最多 3 次)
- [ ] 实现服务端错误提示(如 session 过期)
- [ ] 补充 loading、empty、error 状态

产出:

- 任务恢复和失败重试体验完整

## 风险点

### File API 无本地路径

Web 端 File 对象无本地文件路径,断电或关闭标签页后无法从磁盘恢复原文件。

应对:

- 只能靠服务端已传分片续传
- 未传完且 File 对象丢失时,需提示用户重新选择文件
- 建议:刷新页面后提示"上传未完成,请重新选择文件继续上传"

### chunk/complete/消息幂等需一起做

`/upload/chunk`、`/upload/complete` 和消息创建必须幂等,否则重试会重复建消息。

应对:

- `/upload/chunk` 已幂等,已存在 chunk 不重复计数
- `/upload/complete` 需幂等,重复调用不重复建消息
- 服务端需以 `uploadSessionId` 或 `clientMsgId` 去重

### 秒传不能只靠采样 hash

秒传判断不能只靠采样 hash 作为最终唯一依据,需结合完整 hash 或文件大小。

应对:

- init 阶段传入 `sample_hash` 和 `content_hash`
- 服务端以 `content_hash + size` 去重
- 秒传命中后仍需校验文件完整性

### 大文件浏览器内存

浏览器内存有限,大文件(如 1GB 视频)可能导致内存溢出。

应对:

- 使用 `File.slice` 流式读取,不一次性加载整个文件到内存
- 分片上传时只读取当前分片,上传完成后释放
- 建议:单文件大小限制(如 2GB)

### File 对象无法持久化到 IndexedDB

File 对象无法直接持久化到 IndexedDB,刷新页面后丢失。

应对:

- IndexedDB 只存储任务元数据(不存储 File 对象)
- 刷新页面后提示用户重新选择文件
- 用户重新选择文件后,从 `/upload/status` 查询已落盘分片,续传未完成分片
