# Corner Chat 即时通讯服务端

## <img src="../../docs/img/logo.png" align="left" width=80 > 一款跨平台即时通讯桌面应用。采用前后端分离架构，前端利用 Turborepo 构建 Monorepo 架构，将 Electron 主进程、渲染进程（React）及共享包进行统一治理；后端基于 NestJS 提供 RESTful 与 WebSocket 服务。

## 📦 快速开始

#### 环境要求(本人本地环境，不一定严格要求)

- Node.js v24.7.0
- pnpm v9.0.0
- mysql 8.0
- redis 7-alpine

#### 启动

```bash
# clone 项目
git clone https://github.com/xieyongyi0614/c_chat_service.git
cd c_chat_service

# 安装依赖
pnpm install

# 生成prisma
pnpm run prisma:generate
pnpm run prisma:migrate:deploy

# 启动
pnpm run dev
```
