# IM 主链路压测

## 背景

桌面端和 Web 端已经共用服务端 HTTP、Socket.IO 与 `shared-protobuf` 协议。为了判断当前本地开发环境的聊天承载能力，需要用脚本模拟真实客户端主链路，而不是只测页面渲染或单个健康检查接口。

本压测以聊天体验为判定口径：当某个并发档位的 `p95 ack` 延迟超过 2 秒，或消息错误率超过 1%，即认为该档位不可接受。

## 当前基础

- 服务端默认运行在 `http://localhost:2000/api`，Socket.IO 命名空间为 `http://localhost:2000/chat`。
- 认证接口为 `/auth/sign-up` 和 `/auth/sign-in`，返回 JWT 后通过 socket `auth.token` 建连。
- 聊天消息统一通过 Socket.IO `message` 事件传输 `Command` protobuf。
- `sendMessage` 支持通过 `targetId` 自动创建私聊会话，服务端先返回 `ackSendMessage`，再广播 `newUpdateMessage`。
- 本地依赖使用 `docker-compose.service-dev.yml` 提供 MySQL 和 Redis。

## 目标

- 新增可复现压测脚本 `scripts/loadtest-im.mjs`。
- 新增生产形态资源档位编排脚本 `scripts/run-prod-resource-loadtest.mjs`。
- 自动创建 `loadtest_*` 用户并登录获取 token。
- 按阶梯并发压测 IM 主链路：注册/登录、WebSocket 建连、发文本消息、接收 ack 与广播。
- 输出每档并发的连接数、发送数、ack 成功数、ack 超时数、断线数、错误率、p50/p95/p99 延迟。
- 找出当前本地开发环境在聊天体验阈值下的可接受并发上限。

## 产品需求

- 默认压测阶梯：`10,25,50,100,200,400`。
- 默认每档持续 60 秒。
- 默认每个虚拟用户保持一个 WebSocket 连接，每 5 秒发送一条文本消息。
- 默认 ack 超时 20 秒。
- 默认用户准备并发为 10；该参数只影响注册/登录准备阶段，不计入压测并发。
- 默认失败阈值：`p95 ack > 2000ms` 或错误率 `> 1%`。
- 触发失败阈值后停止后续阶梯，并把上一档作为当前可接受并发。
- 生产形态资源压测使用 service build 产物 `node dist/src/main.js`，不使用 watch/dev 模式。
- 资源档位为 `2c4g` 和 `4c8g`：Windows 下通过 CPU affinity 近似限制 CPU 核数，通过 `NODE_OPTIONS=--max-old-space-size` 限制 Node 堆内存。

## Web 适配要点

- 脚本不拉起 Electron 或浏览器 UI，只模拟 Web/桌面端共用的服务端协议链路。
- Socket payload 必须使用 `@c_chat/shared-protobuf`，不手写 JSON 协议。
- 只使用 `/chat` 命名空间的 `message` 事件，与 Web 和桌面端一致。
- 压测结果代表本地开发环境服务端容量，不代表生产容量。
- 当前服务端开发日志较多，日志 I/O 会影响并发上限，报告解读时需要单独说明。
- Windows 本地 CPU affinity 只限制 Node 服务进程可调度 CPU，不限制 MySQL、Redis 或压测客户端进程；如果要做硬资源隔离，建议后续补 Docker cgroup 或独立云主机压测。

## 任务编排

- [x] 新增 `scripts/loadtest-im.mjs`。
- [x] 支持命令行参数覆盖 API 地址、Socket 地址、阶梯、持续时间、发送间隔、ack 超时和阈值。
- [x] 自动注册或登录压测用户。
- [x] 使用 protobuf 编码 `sendMessage`，监听 `ackSendMessage` 计算延迟。
- [x] 汇总每档并发指标并在失败阈值处停止。
- [x] 本地启动 MySQL/Redis 和 service 后执行开发形态正式压测。
- [x] 将开发形态实测结果补充到本文件的“实测结果”章节。
- [x] 新增生产形态资源档位编排脚本。
- [ ] 执行 `2c4g` 生产形态资源压测。
- [ ] 执行 `4c8g` 生产形态资源压测。

## 风险点

- 自动创建压测用户、会话和消息会写入本地开发库，必要时需要手动清理 `loadtest_*` 数据。
- 如果服务端没有启动，脚本会在注册或建连阶段失败。
- 如果 `packages/shared-protobuf` 没有构建产物，需要先执行相关 build 或根目录 install/build。
- 大量服务端 `console.log` 会降低本地压测上限。
- 本机 CPU、内存、Docker、MySQL 配置都会影响结果，不能直接外推到生产环境。

## 实测结果

### 开发形态 baseline

执行时间：2026-06-09 23:01-23:11，服务端为当时本地已启动实例。

| 阶梯 |   连接数 | 发送数 | ack 成功 | ack 超时 | 断线 | 错误率 |   p50 |    p95 |    p99 | 结论                 |
| ---- | -------: | -----: | -------: | -------: | ---: | -----: | ----: | -----: | -----: | -------------------- |
| 10   |       10 |    120 |      120 |        0 |    0 |  0.00% |   4ms |    7ms |    7ms | 可接受               |
| 25   |       25 |    300 |      300 |        0 |    0 |  0.00% |   7ms |   13ms |   14ms | 可接受               |
| 50   |       50 |    600 |      600 |        0 |    0 |  0.00% |  13ms |   26ms |   28ms | 可接受               |
| 100  |      100 |   1200 |     1200 |        0 |    0 |  0.00% |  25ms |   50ms |   53ms | 可接受               |
| 200  |      200 |   2400 |     2400 |        0 |    0 |  0.00% |  47ms |  106ms |  115ms | 可接受               |
| 400  |      400 |   4800 |     4800 |        0 |    0 |  0.00% | 100ms |  294ms |  315ms | 可接受               |
| 800  |      800 |   9600 |     9600 |        0 |    0 |  0.00% | 269ms |  892ms | 1066ms | 可接受               |
| 1200 | 861/1200 |  10332 |    10332 |        0 |    0 |  0.00% | 366ms | 1129ms | 1292ms | 不可接受：连接数不足 |

当前开发形态 baseline：800 并发可接受；1200 档位因只连接 861 个 socket 判定不可接受。

### 生产形态资源压测

推荐命令：

```bash
pnpm exec node scripts/run-prod-resource-loadtest.mjs
```

只跑 2 核 4G：

```bash
pnpm exec node scripts/run-prod-resource-loadtest.mjs --profiles 2c4g
```

只跑 4 核 8G：

```bash
pnpm exec node scripts/run-prod-resource-loadtest.mjs --profiles 4c8g
```

快速自检命令：

```bash
pnpm exec node scripts/run-prod-resource-loadtest.mjs --profiles 2c4g --steps 2 --durationMs 10000 --messageIntervalMs 2000
```

默认会隐藏 service stdout/stderr，避免大量日志影响压测结果。需要排查服务端日志时追加：

```bash
pnpm exec node scripts/run-prod-resource-loadtest.mjs --serviceLogs inherit
```

生产资源压测结果待执行后补充。

### 单独运行协议压测脚本

如果服务端已经启动，可直接运行：

```bash
pnpm exec node scripts/loadtest-im.mjs --steps 2 --durationMs 10000 --messageIntervalMs 2000
```
