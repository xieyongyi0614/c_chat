import { spawnSync } from 'node:child_process';

const composeFile = 'docker-compose.service-dev.yml';
const isWin = process.platform === 'win32';

function run(command, args, options = {}) {
  const isCmdScript =
    process.platform === 'win32' && ['pnpm', 'npm', 'npx', 'turbo'].includes(command);

  const actualCommand = process.platform === 'win32' && isCmdScript ? `${command}.cmd` : command;

  const result = spawnSync(actualCommand, args, {
    stdio: 'inherit',
    shell: isCmdScript,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function runSilent(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: false,
  });

  return result.status === 0;
}

function ensureDockerInstalled() {
  const installed = runSilent('docker', ['--version']) || runSilent('docker.exe', ['--version']);

  if (!installed) {
    throw new Error(`
未检测到 Docker。

请先安装 Docker Desktop：
https://www.docker.com/products/docker-desktop/
`);
  }
}

function ensureDockerRunning() {
  const running = runSilent('docker', ['info']) || runSilent('docker.exe', ['info']);

  if (!running) {
    throw new Error(`
Docker Desktop 未启动。

请先：

1. 打开 Docker Desktop
2. 等待显示 "Engine running"
3. 再重新执行当前命令

如果 Docker 无法启动，请检查：

- WSL2 是否安装
- BIOS 是否开启虚拟化
`);
  }
}

function detectDockerCompose() {
  if (runSilent('docker', ['compose', 'version'])) {
    return ['docker', ['compose']];
  }

  if (runSilent('docker-compose', ['version'])) {
    return ['docker-compose', []];
  }

  throw new Error(`
未检测到 Docker Compose。

请升级 Docker Desktop，
或者安装 docker compose plugin。
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForService(name, healthcheckArgs, composeCommand, composeBaseArgs) {
  const maxRetries = 60;

  console.log(`> 等待 ${name} 就绪`);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const result = spawnSync(
      composeCommand,
      [...composeBaseArgs, 'exec', '-T', name, ...healthcheckArgs],
      {
        stdio: 'ignore',
        shell: false,
      },
    );

    if (result.status === 0) {
      console.log(`> ${name} 已就绪`);
      return;
    }

    process.stdout.write(`\r> ${name} 启动中 (${attempt}/${maxRetries})`);

    await sleep(2000);
  }

  console.log('');

  throw new Error(`
${name} 启动超时。

请执行以下命令查看日志：

docker compose -f ${composeFile} logs ${name}
`);
}

async function main() {
  console.log('> 检查 Docker 环境');

  ensureDockerInstalled();

  ensureDockerRunning();

  const [composeCommand, composeArgs] = detectDockerCompose();

  const composeBaseArgs = [...composeArgs, '-f', composeFile];

  console.log('> 启动 mysql / redis');

  run(composeCommand, [...composeBaseArgs, 'up', '-d', 'mysql', 'redis']);

  await waitForService(
    'mysql',
    ['mysqladmin', 'ping', '-h', 'localhost', '-uroot', '-proot', '--silent'],
    composeCommand,
    composeBaseArgs,
  );

  await waitForService(
    'redis',
    ['redis-cli', '-a', 'redis123456', 'ping'],
    composeCommand,
    composeBaseArgs,
  );

  console.log('');
  console.log('> 安装依赖');

  run('pnpm', ['install']);

  console.log('');
  console.log('> 生成 Prisma Client');

  run('pnpm', ['--filter', 'c_chat_service', 'prisma:generate']);

  console.log('');
  console.log('> 同步 Prisma schema');

  run('pnpm', ['--filter', 'c_chat_service', 'prisma:push']);

  console.log('');
  console.log('✅ Service 本地开发环境已准备完成');
  console.log('');
  console.log('下一步运行：');
  console.log('pnpm run dev');
}

main().catch((error) => {
  console.error('');
  console.error('❌ 启动失败');
  console.error('');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});
