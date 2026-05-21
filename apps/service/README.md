# Corner Chat 即时通讯服务端

## <img src="../../docs/img/logo.png" align="left" width=80 > 一款跨平台即时通讯桌面应用。采用前后端分离架构，前端利用 Turborepo 构建 Monorepo 架构，将 Electron 主进程、渲染进程（React）及共享包进行统一治理；后端基于 NestJS 提供 RESTful 与 WebSocket 服务。

## 📦 快速开始

#### 环境要求(本人本地环境，不一定严格要求)

- Node.js v24.7.0
- pnpm v9.0.0
- Docker / Docker Compose（推荐，用于本地启动 MySQL、Redis）
- MySQL 8.0（也可以使用本机已有服务）
- Redis 7（也可以使用本机已有服务）

#### 启动

```bash
# clone 项目
git clone https://github.com/xieyongyi0614/c_chat.git
cd c_chat

# 首次启动前：一键准备数据库、Redis 和 Prisma
pnpm run setup:service

# 启动整个 monorepo
pnpm run dev
```

如果只启动 service：

```bash
pnpm --filter c_chat_service dev
```

## 本地依赖部署

service 依赖 MySQL、Redis 和 Prisma Client。首次 clone 后推荐使用根目录的一键脚本：

```bash
pnpm run setup:service
```

脚本会依次完成：

- 使用 `docker-compose.service-dev.yml` 启动 MySQL 8.0 和 Redis 7
- 执行 `pnpm install`
- 执行 `pnpm --filter c_chat_service prisma:generate`
- 执行 `pnpm --filter c_chat_service prisma:push`

如果本机 `3306` 或 `6379` 端口已经有服务，脚本会跳过对应 Docker 服务，直接使用本机已有的 MySQL / Redis。此时请确保它们的账号密码与 `apps/service/.env.development` 一致，或先修改该 env 文件。

默认配置来自 `apps/service/.env.development`：

```env
DATABASE_URL="mysql://root:root@localhost:3306/c_chat"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=c_chat
DB_USER=root
DB_PASSWORD=root

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123456
```

Docker Compose 会创建以下本地服务：

| 服务  | 镜像             | 端口   | 说明                       |
| ----- | ---------------- | ------ | -------------------------- |
| MySQL | `mysql:8.0`      | `3306` | 默认创建 `c_chat` 数据库   |
| Redis | `redis:7-alpine` | `6379` | 默认启用密码 `redis123456` |

如果你不想使用 Docker，可以先自行创建 MySQL 数据库和 Redis 实例，然后调整 `apps/service/.env.development`，再手动执行：

```bash
pnpm install
pnpm --filter c_chat_service prisma:generate
pnpm --filter c_chat_service prisma:push
```

常用维护命令：

```bash
# 启动本地 MySQL / Redis
docker compose -f docker-compose.service-dev.yml up -d

# 停止本地 MySQL / Redis（保留数据卷）
docker compose -f docker-compose.service-dev.yml down

# 查看 service Prisma Studio
pnpm --filter c_chat_service prisma:studio
```
