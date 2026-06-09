import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SERVICE_DIR = resolve(ROOT, 'apps/service');
const LOADTEST_SCRIPT = resolve(ROOT, 'scripts/loadtest-im.mjs');
const DEFAULT_PROFILES = {
  '2c4g': { cpus: 2, memoryMb: 4096, port: 2202 },
  '4c8g': { cpus: 4, memoryMb: 8192, port: 2204 },
};
const DEFAULT_STEPS = '100,200,400,800,1200';
const DEFAULT_DURATION_MS = '60000';
const DEFAULT_MESSAGE_INTERVAL_MS = '5000';
const READY_TIMEOUT_MS = 30_000;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const selectedProfiles = String(args.profiles || '2c4g,4c8g')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

for (const profile of selectedProfiles) {
  if (!DEFAULT_PROFILES[profile]) {
    throw new Error(`Unknown profile "${profile}". Available: ${Object.keys(DEFAULT_PROFILES)}`);
  }
}

if (!args.skipBuild) {
  await run('pnpm.cmd', ['--filter', '@c_chat/service', 'build'], { cwd: ROOT });
}

const baseEnv = await loadEnvFile(resolve(SERVICE_DIR, '.env.development'));
const results = [];

for (const profileName of selectedProfiles) {
  const profile = DEFAULT_PROFILES[profileName];
  const service = await startService(profileName, profile, baseEnv);

  try {
    await waitForReady(profile.port);
    const exitCode = await runLoadTest(profileName, profile);
    results.push({ profileName, exitCode });
  } finally {
    service.kill();
    await sleep(2_000);
  }
}

console.log('');
console.table(
  results.map((item) => ({
    profile: item.profileName,
    loadtest_exit_code: item.exitCode,
    note: item.exitCode === 0 ? 'all steps acceptable' : 'threshold reached or loadtest failed',
  })),
);

function startService(profileName, profile, baseEnv) {
  const nodeOptions = [
    `--max-old-space-size=${profile.memoryMb}`,
    process.env.NODE_OPTIONS || '',
  ]
    .filter(Boolean)
    .join(' ');
  const env = {
    ...process.env,
    ...baseEnv,
    NODE_ENV: 'production',
    PORT: String(profile.port),
    NEXT_PUBLIC_API_URL: `http://localhost:${profile.port}/api`,
    NODE_OPTIONS: nodeOptions,
  };

  console.log('');
  console.log(
    `Starting service profile ${profileName}: ${profile.cpus} CPU affinity, ${profile.memoryMb}MB Node heap, port ${profile.port}`,
  );

  const child = spawn(process.execPath, ['dist/src/main.js'], {
    cwd: SERVICE_DIR,
    env,
    stdio: args.serviceLogs === 'inherit' ? ['ignore', 'inherit', 'inherit'] : 'ignore',
  });

  child.once('exit', (code, signal) => {
    if (code !== null || signal) {
      console.log(`Service profile ${profileName} exited: code=${code}, signal=${signal}`);
    }
  });

  applyCpuAffinity(child.pid, profile.cpus).catch((error) => {
    console.warn(`Could not apply CPU affinity for ${profileName}: ${error.message}`);
  });

  return child;
}

async function runLoadTest(profileName, profile) {
  const prefix = args.prefix || `loadtest_prod_${profileName}_${Date.now()}`;
  const loadtestArgs = [
    LOADTEST_SCRIPT,
    '--apiUrl',
    `http://localhost:${profile.port}/api`,
    '--socketUrl',
    `http://localhost:${profile.port}/chat`,
    '--steps',
    String(args.steps || DEFAULT_STEPS),
    '--durationMs',
    String(args.durationMs || DEFAULT_DURATION_MS),
    '--messageIntervalMs',
    String(args.messageIntervalMs || DEFAULT_MESSAGE_INTERVAL_MS),
    '--prefix',
    prefix,
  ];

  if (args.ackTimeoutMs) {
    loadtestArgs.push('--ackTimeoutMs', String(args.ackTimeoutMs));
  }
  if (args.p95LimitMs) {
    loadtestArgs.push('--p95LimitMs', String(args.p95LimitMs));
  }
  if (args.errorRateLimit) {
    loadtestArgs.push('--errorRateLimit', String(args.errorRateLimit));
  }
  if (args.prepareConcurrency) {
    loadtestArgs.push('--prepareConcurrency', String(args.prepareConcurrency));
  }

  return run(process.execPath, loadtestArgs, {
    cwd: ROOT,
    allowExitCodes: [0, 1],
  });
}

async function applyCpuAffinity(pid, cpus) {
  if (process.platform !== 'win32') {
    return;
  }

  const mask = 2 ** cpus - 1;
  await run(
    'powershell.exe',
    ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).ProcessorAffinity = ${mask}`],
    { cwd: ROOT },
  );
}

async function waitForReady(port) {
  const startedAt = Date.now();
  const url = `http://localhost:${port}/api`;

  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await sleep(1_000);
    }
  }

  throw new Error(`Service did not become ready within ${READY_TIMEOUT_MS}ms: ${url}`);
}

async function run(command, commandArgs, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd || ROOT,
      env: options.env || process.env,
      stdio: options.stdio || 'inherit',
      shell: process.platform === 'win32' && command.endsWith('.cmd'),
    });

    child.once('error', rejectPromise);
    child.once('exit', (code) => {
      const exitCode = code ?? 1;
      const allowed = options.allowExitCodes || [0];
      if (allowed.includes(exitCode)) {
        resolvePromise(exitCode);
        return;
      }
      rejectPromise(new Error(`${command} ${commandArgs.join(' ')} failed with ${exitCode}`));
    });
  });
}

async function loadEnvFile(path) {
  const content = await readFile(path, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^"(.*)"$/, '$1');
  }

  return env;
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--skipBuild') {
      parsed.skipBuild = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    parsed[rawKey] = inlineValue ?? argv[index + 1];
    if (inlineValue == null) index += 1;
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function printHelp() {
  console.log(`
Usage:
  pnpm exec node scripts/run-prod-resource-loadtest.mjs [options]

Options:
  --profiles <csv>             Default: 2c4g,4c8g
  --steps <csv>                Default: ${DEFAULT_STEPS}
  --durationMs <number>        Default: ${DEFAULT_DURATION_MS}
  --messageIntervalMs <num>    Default: ${DEFAULT_MESSAGE_INTERVAL_MS}
  --ackTimeoutMs <number>      Forwarded to loadtest-im
  --p95LimitMs <number>        Forwarded to loadtest-im
  --errorRateLimit <number>    Forwarded to loadtest-im
  --prepareConcurrency <num>   Forwarded to loadtest-im
  --prefix <string>            Default: loadtest_prod_<profile>_<timestamp>
  --serviceLogs <mode>         ignore or inherit. Default: ignore
  --skipBuild                  Skip service build before running

Profiles:
  2c4g: Windows CPU affinity mask for 2 CPUs, Node heap 4096MB, port 2202
  4c8g: Windows CPU affinity mask for 4 CPUs, Node heap 8192MB, port 2204
`);
}
