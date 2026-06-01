# 认证与用户需求分析与任务编排

## 背景

认证与用户资料是 Web 端 IM 的入口能力。用户需要完成登录、注册、自动登录、登出、资料编辑，才能进入会话列表和消息主流程。桌面端通过 IPC 进入主进程认证逻辑；Web 端不复刻 IPC，而是通过 `packages/shared-api` 的认证 service 和 Web 运行时 adapter 直连后端。

## 当前基础

### 已具备

- `packages/shared-api/src/services/authService.ts` 已提供 `signIn`、`signUp`、`getUserInfo`、`updateUserProfile`。
- `packages/shared-api/src/http/httpClient.ts` 已支持 token 注入、错误上报、HTTP 请求封装。
- `packages/shared-types` 已有 `AuthTypes.PostSignInParams`、`PostSignUpParams`、`GetUserInfoResponse`、`UpdateUserProfileParams` 等类型。
- 桌面端已有登录、注册、资料编辑和路由守卫 UI，可作为交互参考。
- `packages/chat_ui` 已提供 Button、Input、Form、Dialog、Avatar、Select、Spinner 等基础 UI。

### 主要缺口

- Web 端需要实现 `TokenProvider` 和登录态持久化策略。
- Web 端需要确定 Next.js 路由保护和客户端水合后的自动登录流程。
- 头像上传不能再传 `avatarFilePath`，需要走 File API + 媒体上传链路得到 `avatarUrl`。
- 用户列表/搜索如未沉淀到 `shared-api`，需要补充对应 service，而不是页面直接拼请求。

## 目标

### 一期目标

- 用户可以登录、注册、自动登录和登出。
- 用户可以查看和编辑自己的昵称、头像。
- 用户列表/搜索可用于新建私聊和创建群聊选人。
- 所有请求通过 `shared-api`，类型复用 `shared-types`。
- UI 基础组件使用 `chat_ui` / shadcn，不手写基础表单、弹窗和选择器。

### 二期方向

- httpOnly cookie 登录态。
- 多账号切换。
- 手机验证码、找回密码、第三方登录。
- 更细的账号安全设置。

## 产品需求

### 登录

用户输入 email 和 password，提交后获取 token 和用户信息，进入聊天主界面。

验收标准：

- email、password 必填，并使用表单 schema 校验。
- 提交中显示 loading，禁止重复提交。
- 登录成功后持久化 token。
- 登录成功后调用 `getUserInfo` 并写入用户状态。
- 登录成功后初始化实时连接。
- 登录失败时展示服务端错误信息。

### 注册

用户输入 email、username、password，可选 phone 和 gender，注册成功后进入登录态。

验收标准：

- email、username、password 必填。
- phone、gender 可选，gender 取值沿用后端类型约定。
- 注册成功后保存 token 并拉取当前用户信息。
- 注册成功后进入聊天主界面。
- 注册失败时展示服务端错误信息。

### 自动登录

应用启动时读取本地 token，验证有效后直接进入聊天主界面。

验收标准：

- 无 token 时进入登录页。
- 有 token 时调用 `getUserInfo` 验证登录态。
- token 有效时恢复用户状态和实时连接。
- token 无效时清理 token 并进入登录页。
- 自动登录只在客户端水合后读取浏览器存储，避免 SSR 访问 localStorage。

### 登出

用户主动登出后清理登录态、实时连接和敏感缓存。

验收标准：

- 清除 token。
- 销毁 `RealtimeClient`。
- 清除用户状态。
- 清除会话、消息等当前账号敏感缓存。
- 跳转登录页。
- 登出后刷新页面不会恢复上一个账号状态。

### 用户资料编辑

用户可以修改昵称和头像。

验收标准：

- 展示当前昵称和头像。
- 昵称可编辑，长度限制沿用后端或产品约定。
- 头像通过 File API 选择图片。
- 头像上传走 [06 媒体上传](06_MEDIA_UPLOAD.md) 或头像专用上传 service，最终提交 `avatarUrl`。
- 不在 Web 端传 `avatarFilePath`。
- 更新成功后刷新当前用户状态。

### 用户列表与搜索

提供用户分页列表和关键字搜索，供创建私聊、创建群聊和邀请群成员使用。

验收标准：

- 用户列表请求通过 `shared-api` service。
- 分页结构遵守后端契约，读取 `list`。
- 支持关键字搜索。
- 展示头像、昵称、邮箱等基础信息。
- 支持单选或多选场景复用。
- 不使用 mock 用户数据。

## Web 适配要点

- 认证请求走 `shared-api` 的 `AuthService`；缺失的用户列表能力应补到 `shared-api`。
- token 一期可存 localStorage 或 IndexedDB，但必须封装在 `TokenProvider` 内。
- Next.js 路由保护需处理客户端水合时序，避免重定向闪烁和循环。
- 头像上传依赖 File API，不能沿用桌面端本地路径。
- 表单使用 `chat_ui` / shadcn 的 Form、Input、Select、Button、Dialog、Avatar、Spinner。
- Web 一期只做单账号，相关取舍见 [09 桌面能力取舍](09_DESKTOP_CAPABILITY_MAP.md)。

## 任务编排

### 阶段 0：认证服务边界确认

目标：先确认 Web 认证只走 `shared-api`。

- [x] 确认 `signIn`、`signUp`、`getUserInfo`、`updateUserProfile` 满足 Web 一期。
- [x] 确认是否需要在 `shared-api` 补充 `logout`。
- [x] 确认是否需要在 `shared-api` 补充 `getUserList`。
- [x] 确认 token 持久化位置和 `TokenProvider` 行为。
- [x] 确认登录成功后如何初始化 `RealtimeClient`。

产出：

- 认证 service 和登录态边界明确。

### 阶段 1：登录注册

目标：用户可创建账号并登录。

- [x] 实现登录页表单。
- [x] 实现注册页表单。
- [x] 接入 `AuthService.signIn`。
- [x] 接入 `AuthService.signUp`。
- [x] 登录/注册成功后保存 token。
- [x] 登录/注册成功后拉取当前用户信息。
- [x] 登录/注册失败时展示错误反馈。

产出：

- 用户可以完成注册和登录，并进入聊天主界面。

### 阶段 2：自动登录与登出

目标：登录态可恢复，登出可清理。

- [x] 实现客户端水合后的自动登录检查。
- [x] 有效 token 自动恢复用户状态。
- [x] 无效 token 自动清理并进入登录页。
- [x] 实现登出动作。
- [x] 登出时销毁实时连接。
- [x] 登出时清理敏感缓存。

产出：

- 刷新页面后登录态正确恢复，登出后状态干净。

### 阶段 3：资料编辑

目标：用户可以更新个人资料。

- [x] 实现资料编辑弹窗或页面。
- [x] 展示当前头像和昵称。
- [x] 支持昵称编辑。
- [ ] 支持 File API 选择头像。
- [ ] 上传头像并得到 `avatarUrl`。
- [x] 调用 `updateUserProfile` 保存。
- [x] 保存成功后刷新用户状态。

产出：

- 用户资料编辑闭环可用（头像上传待媒体上传模块完成后补充）。

### 阶段 4：用户列表与搜索

目标：为私聊和群聊提供选人能力。

- [x] 补齐或接入 `shared-api` 用户列表 service。
- [ ] 实现分页加载。
- [x] 实现关键字搜索。
- [x] 实现单选和多选能力。
- [ ] 在新建私聊和创建群聊中复用。

产出：

- 用户选择能力可被会话和群聊模块复用（UI 待会话和群聊模块时实现）。

## 风险点

- token 存在浏览器存储中有 XSS 风险，需要配合 CSP 和登出清理。
- Next.js SSR 无法直接读取 localStorage，自动登录必须在客户端处理。
- 用户列表不能使用 mock 数据，否则会影响私聊和群聊真实流程。
- 头像上传依赖媒体上传链路，若上传未完成，资料编辑需要先禁用头像能力或拆阶段交付。
- 不要为认证单独写 Web 请求工具，避免绕过 `shared-api`。
