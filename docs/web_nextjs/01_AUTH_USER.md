# 认证与用户需求分析与任务编排

## 背景

认证是进入 IM 的前置能力。用户需要通过登录/注册获得身份凭证，才能访问聊天、会话列表等核心功能。桌面端通过 IPC 调用主进程，主进程持有 HTTP 客户端与 token 持久化能力，完成与 NestJS 的认证交互。链路为 `React → IPC → 主进程 → NestJS`。

Web 端没有主进程这一层。浏览器侧需要由 browser service 模块直接持有 Axios 与 token 存储能力，直连 NestJS 完成认证。链路为 `React → browser service → NestJS`。传输底座见 [02_TRANSPORT_DATA.md](02_TRANSPORT_DATA.md)。

## 当前桌面端实现

### IPC 方法签名

桌面端认证相关 IPC 方法定义在 `packages/shared-types/src/lib/ipc/ipcCallTypes/authPreloadTypes.ts`：

```typescript
SignIn: IpcMethod<PostSignInParams, void>
  PostSignInParams: { email: string; password: string }

SignUp: IpcMethod<PostSignUpParams, void>
  PostSignUpParams: { email: string; username: string; password: string; phone?: string; gender?: number }
  gender 取值：0-女, 1-男, 2-其他

GetUserInfo: () => Promise<GetUserInfoResponse | undefined>
  GetUserInfoResponse: { id: string; email: string; nickname: string | null; avatarUrl: string | null; state: number }

UpdateUserProfile: IpcMethod<UpdateUserProfileParams, GetUserInfoResponse | undefined>
  UpdateUserProfileParams: { nickname?: string; avatarUrl?: string; avatarFilePath?: string }
  avatarFilePath 为本地路径，主进程上传后得到 avatarUrl

AutoSignIn: () => Promise<void>

Logout: () => Promise<void>

GetUserList: IpcMethod<GetUserListParams, ResponseList<UserListItem>>
  用于分页拉取用户列表，支持新建会话选人
```

### 实现位置

- IPC 实现：`apps/electron_client/src/ipc/api/authIpc.ts`
- 登录页面：`apps/frontend/src/pages/auth/UserSignInForm.tsx`（react-hook-form + zod 校验）
- 注册页面：`apps/frontend/src/pages/auth/UserSignUpForm.tsx`（react-hook-form + zod 校验）
- 路由守卫：`apps/frontend/src/pages/auth/CheckAuth.tsx`
- 用户状态：`apps/frontend/src/stores/userStore.ts`（Zustand）
- 资料编辑：`apps/frontend/src/layout/components/LeftSidebar/ProfileDialog.tsx`、`AccountMenu.tsx`
- token 持久化：主进程 `StoreTable`（SQLite KV 存储）

## Web 端目标

一比一复刻桌面端的登录、注册、自动登录、登出、用户资料编辑、用户列表功能。调用方式从 IPC 改为 browser service 直连 NestJS。token 从主进程 SQLite 迁移到浏览器 localStorage 或 IndexedDB。头像上传从主进程本地路径上传改为浏览器 File API 选图并走上传链路。

## 产品需求与验收

### 登录

用户输入 email 和 password，表单校验通过后提交登录请求。成功后存储 token、拉取用户信息、跳转聊天页。失败时 toast 展示错误信息。

验收标准：

- email 和 password 必填，使用 zod 校验格式。
- 提交时显示 loading 状态，禁用表单。
- 登录成功后 token 持久化到 localStorage 或 IndexedDB。
- 登录成功后调用 `GetUserInfo` 拉取用户信息并写入 `userStore`。
- 登录成功后跳转到聊天页（会话列表）。
- 登录失败时 toast 展示服务端返回的错误信息。
- 表单支持回车提交。

### 注册

用户输入 email、username、password（必填），phone 和 gender（可选）。gender 取值 0-女、1-男、2-其他。注册成功后自动落登录态。

验收标准：

- email、username、password 必填，使用 zod 校验格式。
- phone 可选，填写时校验格式。
- gender 可选，下拉选择 0-女、1-男、2-其他。
- 提交时显示 loading 状态，禁用表单。
- 注册成功后自动存储 token 并拉取用户信息。
- 注册成功后跳转到聊天页。
- 注册失败时 toast 展示服务端返回的错误信息。
- 表单支持回车提交。

### 自动登录

应用启动时读取持久化的 token，如果 token 有效则免登录直接进入聊天页。如果 token 无效或不存在，清除本地 token 并跳转登录页。

验收标准：

- 应用启动时优先尝试自动登录。
- 有 token 时调用 `AutoSignIn` 或 `GetUserInfo` 验证 token 有效性。
- token 有效时直接进入聊天页，不展示登录页。
- token 无效时清除本地 token 并跳转登录页。
- 自动登录失败不阻塞应用启动，静默回退到登录页。

### 登出

用户主动登出时，清除 token、断开 Socket 连接、清除敏感缓存（用户信息、会话列表、消息等），跳转登录页。

验收标准：

- 调用 `Logout` 清除服务端会话（如有）。
- 清除本地 token。
- 断开 Socket 连接。
- 清除 `userStore` 中的用户信息。
- 清除会话列表和消息缓存（IndexedDB）。
- 跳转到登录页。
- 登出后无敏感数据残留在浏览器存储中。

### 用户资料编辑

用户可以修改昵称和头像。头像在 Web 端使用 File API 选择本地图片，通过上传链路得到 URL 后提交 `UpdateUserProfile`。成功后刷新 `userStore`。

验收标准：

- 展示当前用户昵称和头像。
- 昵称输入框支持编辑，限制长度（如 1-20 字符）。
- 头像支持点击选择本地图片文件（File API）。
- 选择图片后预览新头像。
- 提交时先上传图片得到 URL（依赖 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md) 上传链路）。
- 上传成功后调用 `UpdateUserProfile` 提交 `avatarUrl`。
- 更新成功后刷新 `userStore` 中的用户信息。
- 更新失败时 toast 展示错误信息。
- 提交时显示 loading 状态，禁用表单。

### 用户列表/搜索

分页拉取用户列表，用于新建会话时选择联系人。支持搜索过滤。

验收标准：

- 调用 `GetUserList` 分页拉取用户列表。
- 支持滚动加载更多（分页）。
- 支持搜索框输入关键词过滤用户（email、username、nickname）。
- 展示用户头像、昵称、email。
- 支持多选用户。
- 选中用户后可用于创建私聊或群聊会话。

## Web 适配要点

### 路由守卫

桌面端使用 `CheckAuth.tsx` 组件包裹路由，检查登录态。Web 端需要适配 Next.js 路由保护机制：

- 使用 Next.js middleware 在服务端检查 token（如果 token 存储在 cookie）。
- 或在客户端组件中检查 token（如果 token 存储在 localStorage）。
- 未登录时重定向到登录页。

### token 持久化

桌面端 token 存储在主进程 `StoreTable`（SQLite）。Web 端需要迁移到浏览器存储：

- localStorage：简单直接，但存在 XSS 读取风险。
- IndexedDB：更安全，但读写异步。
- cookie（httpOnly）：最安全，但需要服务端配合设置。

一期建议使用 localStorage，配合内容安全策略（CSP）降低 XSS 风险。

### 头像上传

桌面端 `avatarFilePath` 是本地文件路径，主进程读取文件并上传。Web 端没有本地路径概念，需要：

- 使用 File API 选择图片文件（`<input type="file">`）。
- 将 File 对象传递给上传链路（见 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md)）。
- 上传成功后得到 URL，提交 `UpdateUserProfile` 时只传 `avatarUrl`，不传 `avatarFilePath`。

### 自动登录时序

Next.js SSR 场景下，服务端渲染时无法访问浏览器 localStorage。需要在客户端水合后再检查登录态：

- 服务端渲染时不执行自动登录逻辑。
- 客户端水合后读取 localStorage 中的 token。
- 有 token 时调用 `AutoSignIn` 或 `GetUserInfo` 验证。
- 验证成功后更新 `userStore` 并保持在当前页。
- 验证失败后清除 token 并重定向到登录页。

## 任务拆分

客户端任务（全部初始未勾选）：

- [ ] 实现登录页表单与校验（react-hook-form + zod）。
- [ ] 实现注册页表单与校验（react-hook-form + zod），gender 下拉选择 0/1/2。
- [ ] 实现自动登录逻辑，启动时读取 token 并验证。
- [ ] 实现登出逻辑，清除 token、断开 Socket、清除敏感缓存。
- [ ] 实现用户资料编辑弹窗，支持昵称编辑。
- [ ] 实现头像选择与上传，使用 File API 选图并对接上传链路。
- [ ] 实现用户列表分页拉取与搜索过滤。
- [ ] 实现 Next.js 路由守卫，未登录时重定向到登录页。
- [ ] 对接 browser service 认证方法（SignIn、SignUp、GetUserInfo、UpdateUserProfile、AutoSignIn、Logout、GetUserList）。
- [ ] 实现 token 持久化到 localStorage。
- [ ] 实现 `userStore` 对接 browser service。
- [ ] 处理 Next.js SSR 与客户端登录态水合时序。

## 阶段编排

### 阶段 0：browser service 认证方法签名

复用 browser service 认证方法签名，与桌面端 IPC 方法对齐。明确异步语义与返回值。

产出：

- browser service 对外暴露 `SignIn`、`SignUp`、`GetUserInfo`、`UpdateUserProfile`、`AutoSignIn`、`Logout`、`GetUserList` 方法。
- 方法签名与 `authPreloadTypes.ts` 一致。

### 阶段 1：登录/注册/守卫

实现登录页、注册页、路由守卫。用户可以登录进入聊天页。

产出：

- 登录页可用，表单校验正确，登录成功后跳转聊天页。
- 注册页可用，gender 可选 0/1/2，注册成功后自动登录。
- 路由守卫生效，未登录时重定向到登录页。

### 阶段 2：自动登录/登出

实现自动登录与登出。启动时自动登录，登出时清理干净。

产出：

- 应用启动时有 token 则自动登录进入聊天页。
- 登出后清除 token、断开 Socket、清除敏感缓存，回到登录页。

### 阶段 3：资料编辑+头像

实现用户资料编辑，支持昵称和头像修改。头像使用 File API 选图并对接上传链路。

产出：

- 用户可以修改昵称并保存。
- 用户可以选择本地图片上传为头像。
- 更新成功后 `userStore` 刷新。

### 阶段 4：用户列表/搜索

实现用户列表分页拉取与搜索，用于新建会话选人。

产出：

- 用户列表可分页加载。
- 支持搜索过滤用户。
- 可多选用户用于创建会话。

## 风险点

- token 存储在 localStorage 存在 XSS 读取风险，需要配合内容安全策略（CSP）与登出清理控制暴露面。
- 头像上传依赖 [06_MEDIA_UPLOAD.md](06_MEDIA_UPLOAD.md) 上传链路，需要先完成上传链路才能实现头像修改。
- Next.js SSR 与客户端登录态水合存在时序问题，服务端渲染时无法访问 localStorage，需要在客户端水合后再检查登录态，避免闪烁或重定向循环。
- 自动登录失败时需要静默回退到登录页，不能阻塞应用启动或无限重试。
- 登出时需要清除所有敏感缓存（token、用户信息、会话列表、消息等），避免下次登录时数据串号。
