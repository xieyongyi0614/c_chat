import { spawnSync } from 'node:child_process';
import net from 'node:net';

const composeFile = 'docker-compose.service-dev.yml';
const mysqlPort = 3306;
const redisPort = 6379;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function canRun(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

function detectDockerCompose() {
  if (canRun('docker', ['compose', 'version'])) {
    return ['docker', ['compose']];
  }

  if (canRun('docker-compose', ['version'])) {
    return ['docker-compose', []];
  }

  throw new Error('未检测到 Docker Compose，请先安装 Docker Desktop 或 docker compose 插件。');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForLocalPort(name, port) {
  const maxRetries = 60;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    if (await isPortOpen(port)) {
      return;
    }

    await sleep(2000);
  }

  throw new Error(`${name} 端口 ${port} 等待超时，请确认服务是否正常启动。`);
}

async function waitForService(name, args, composeCommand, composeBaseArgs) {
  const maxRetries = 60;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const result = spawnSync(composeCommand, [...composeBaseArgs, 'exec', '-T', name, ...args], {
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });

    if (result.status === 0) {
      return;
    }

    await sleep(2000);
  }

  throw new Error(`${name} 启动超时，请检查 Docker 容器日志。`);
}

async function main() {
  const [composeCommand, composeArgs] = detectDockerCompose();
  const composeBaseArgs = [...composeArgs, '-f', composeFile];
  const shouldStartMysql = !(await isPortOpen(mysqlPort));
  const shouldStartRedis = !(await isPortOpen(redisPort));
  const servicesToStart = [
    shouldStartMysql ? 'mysql' : null,
    shouldStartRedis ? 'redis' : null,
  ].filter(Boolean);

  if (servicesToStart.length > 0) {
    console.log(`> 启动 ${servicesToStart.join(' / ')}`);
    run(composeCommand, [...composeBaseArgs, 'up', '-d', ...servicesToStart]);
  } else {
    console.log('> 检测到本机 3306 和 6379 已有服务，跳过 Docker 启动');
  }

  if (shouldStartMysql) {
    console.log('> 等待 Docker MySQL 就绪');
    await waitForService(
      'mysql',
      ['mysqladmin', 'ping', '-h', 'localhost', '-uroot', '-proot', '--silent'],
      composeCommand,
      composeBaseArgs,
    );
  } else {
    console.log('> 使用本机已有 MySQL：localhost:3306');
    await waitForLocalPort('MySQL', mysqlPort);
  }

  if (shouldStartRedis) {
    console.log('> 等待 Docker Redis 就绪');
    await waitForService(
      'redis',
      ['redis-cli', '-a', 'redis123456', 'ping'],
      composeCommand,
      composeBaseArgs,
    );
  } else {
    console.log('> 使用本机已有 Redis：localhost:6379');
    await waitForLocalPort('Redis', redisPort);
  }

  console.log('> 安装依赖');
  run('pnpm', ['install']);

  console.log('> 生成 Prisma Client');
  run('pnpm', ['--filter', 'c_chat_service', 'prisma:generate']);

  console.log('> 同步 Prisma schema 到本地开发数据库');
  run('pnpm', ['--filter', 'c_chat_service', 'prisma:push']);

  console.log('');
  console.log('Service 本地依赖已准备完成。');
  console.log('下一步可运行：pnpm run dev');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
