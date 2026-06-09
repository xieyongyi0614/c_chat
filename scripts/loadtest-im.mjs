import { io } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
import { Command, SendMessageRequest, AckSendMessage } from '@c_chat/shared-protobuf';
import { ClientToServiceEvent, ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';

const DEFAULT_API_URL = 'http://localhost:2000/api';
const DEFAULT_SOCKET_URL = 'http://localhost:2000/chat';
const DEFAULT_STEPS = [10, 25, 50, 100, 200, 400];
const DEFAULT_DURATION_MS = 60_000;
const DEFAULT_MESSAGE_INTERVAL_MS = 5_000;
const DEFAULT_ACK_TIMEOUT_MS = 20_000;
const DEFAULT_P95_LIMIT_MS = 2_000;
const DEFAULT_ERROR_RATE_LIMIT = 0.01;
const DEFAULT_WARMUP_USERS = 2;
const DEFAULT_PREPARE_CONCURRENCY = 10;
const LOAD_TEST_PASSWORD = 'loadtest123456';

const args = parseArgs(process.argv.slice(2));
const config = {
  apiUrl: args.apiUrl || process.env.LOADTEST_API_URL || DEFAULT_API_URL,
  socketUrl: args.socketUrl || process.env.LOADTEST_SOCKET_URL || DEFAULT_SOCKET_URL,
  steps: args.steps ? parseNumberList(args.steps) : DEFAULT_STEPS,
  durationMs: Number(args.durationMs ?? process.env.LOADTEST_DURATION_MS ?? DEFAULT_DURATION_MS),
  messageIntervalMs: Number(
    args.messageIntervalMs ??
      process.env.LOADTEST_MESSAGE_INTERVAL_MS ??
      DEFAULT_MESSAGE_INTERVAL_MS,
  ),
  ackTimeoutMs: Number(
    args.ackTimeoutMs ?? process.env.LOADTEST_ACK_TIMEOUT_MS ?? DEFAULT_ACK_TIMEOUT_MS,
  ),
  p95LimitMs: Number(args.p95LimitMs ?? process.env.LOADTEST_P95_LIMIT_MS ?? DEFAULT_P95_LIMIT_MS),
  errorRateLimit: Number(
    args.errorRateLimit ?? process.env.LOADTEST_ERROR_RATE_LIMIT ?? DEFAULT_ERROR_RATE_LIMIT,
  ),
  warmupUsers: Number(
    args.warmupUsers ?? process.env.LOADTEST_WARMUP_USERS ?? DEFAULT_WARMUP_USERS,
  ),
  prepareConcurrency: Number(
    args.prepareConcurrency ??
      process.env.LOADTEST_PREPARE_CONCURRENCY ??
      DEFAULT_PREPARE_CONCURRENCY,
  ),
  prefix: args.prefix || process.env.LOADTEST_PREFIX || `loadtest_${Date.now()}`,
};

if (args.help) {
  printHelp();
  process.exit(0);
}

validateConfig(config);

const runStartedAt = new Date();
console.log('IM load test started');
console.log({
  apiUrl: config.apiUrl,
  socketUrl: config.socketUrl,
  steps: config.steps,
  durationMs: config.durationMs,
  messageIntervalMs: config.messageIntervalMs,
  ackTimeoutMs: config.ackTimeoutMs,
  p95LimitMs: config.p95LimitMs,
  errorRateLimit: config.errorRateLimit,
  prepareConcurrency: config.prepareConcurrency,
  prefix: config.prefix,
});

const largestStep = Math.max(config.warmupUsers, ...config.steps);
const users = await prepareUsers(largestStep);
const warmupSummary = await runStep(
  'warmup',
  config.warmupUsers,
  users.slice(0, config.warmupUsers),
  {
    ...config,
    durationMs: Math.min(15_000, config.durationMs),
  },
);

if (!warmupSummary.acceptable) {
  console.log('');
  console.log('Warmup failed. Stop before formal steps.');
  printSummaryTable([warmupSummary]);
  process.exitCode = 1;
} else {
  const summaries = [];

  for (const step of config.steps) {
    const summary = await runStep(String(step), step, users.slice(0, step), config);
    summaries.push(summary);

    if (!summary.acceptable) {
      break;
    }
  }

  console.log('');
  printSummaryTable(summaries);

  const acceptable = summaries.filter((item) => item.acceptable).at(-1);
  const firstFailed = summaries.find((item) => !item.acceptable);

  console.log('');
  console.log(`Run started: ${runStartedAt.toISOString()}`);
  console.log(`Run ended:   ${new Date().toISOString()}`);
  console.log(
    acceptable
      ? `Current acceptable concurrency: ${acceptable.concurrentUsers}`
      : 'Current acceptable concurrency: below first formal step',
  );

  if (firstFailed) {
    console.log(`First unacceptable step: ${firstFailed.concurrentUsers}`);
    process.exitCode = 1;
  }
}

async function prepareUsers(count) {
  const indexes = Array.from({ length: count }, (_, index) => index);
  return runPool(indexes, config.prepareConcurrency, async (index) => {
    const email = `${config.prefix}_${index}@loadtest.local`;
    const username = `${config.prefix}_${index}`;
    return ensureUser(email, username);
  });
}

async function ensureUser(email, username) {
  const registerBody = { email, username, password: LOAD_TEST_PASSWORD, gender: 2 };
  const registerResponse = await requestJson(`${config.apiUrl}/auth/sign-up`, registerBody, {
    allowStatuses: [200, 201, 400, 409],
  });
  const registerToken = getAccessToken(registerResponse.body);

  if (registerToken) {
    return { email, token: registerToken, userId: decodeJwtUserId(registerToken) };
  }

  const loginResponse = await requestJson(`${config.apiUrl}/auth/sign-in`, {
    email,
    password: LOAD_TEST_PASSWORD,
  });
  const token = getAccessToken(loginResponse.body);
  if (!token) {
    throw new Error(`Login did not return access_token for ${email}`);
  }

  return { email, token, userId: decodeJwtUserId(token) };
}

async function runStep(label, concurrentUsers, stepUsers, stepConfig) {
  console.log('');
  console.log(`Step ${label}: ${concurrentUsers} users for ${stepConfig.durationMs}ms`);

  const metrics = createMetrics(concurrentUsers);
  const clients = await Promise.all(
    stepUsers.map(async (user, index) => {
      try {
        return await connectClient(user, stepUsers[(index + 1) % stepUsers.length], metrics);
      } catch (error) {
        metrics.socketErrors += 1;
        metrics.errors.push(error.message);
        return createDisconnectedClient(user, stepUsers[(index + 1) % stepUsers.length]);
      }
    }),
  );

  metrics.connectedUsers = clients.filter((client) => client.socket.connected).length;
  const timers = clients.map((client, index) =>
    setInterval(() => {
      sendLoadMessage(client, index, metrics, stepConfig);
    }, stepConfig.messageIntervalMs),
  );

  clients.forEach((client, index) => {
    setTimeout(() => sendLoadMessage(client, index, metrics, stepConfig), index * 20);
  });

  await sleep(stepConfig.durationMs);

  timers.forEach((timer) => clearInterval(timer));
  await waitForPendingClients(clients, stepConfig.ackTimeoutMs);
  clients.forEach((client) => {
    client.closedByTest = true;
    client.socket.disconnect();
  });

  const summary = summarizeMetrics(label, metrics, stepConfig);
  printStepSummary(summary);
  return summary;
}

async function connectClient(user, targetUser, metrics) {
  const socket = io(config.socketUrl, {
    transports: ['websocket'],
    auth: { token: user.token },
    reconnection: false,
    timeout: 10_000,
  });

  const client = {
    socket,
    user,
    targetUser,
    closedByTest: false,
    pending: new Map(),
  };

  socket.on('message', (data) => {
    handleSocketMessage(client, data, metrics);
  });
  socket.on('disconnect', () => {
    if (client.closedByTest) return;
    metrics.socketDisconnects += 1;
  });
  socket.on('connect_error', (error) => {
    metrics.errors.push(error.message);
  });

  await waitForConnect(socket, user.email);
  return client;
}

function createDisconnectedClient(user, targetUser) {
  return {
    socket: {
      connected: false,
      disconnect() {},
    },
    user,
    targetUser,
    closedByTest: true,
    pending: new Map(),
  };
}

function sendLoadMessage(client, index, metrics, stepConfig) {
  if (!client.socket.connected) {
    metrics.sendSkipped += 1;
    return;
  }

  const clientMsgId = randomUUID();
  const requestId = randomUUID();
  const payload = SendMessageRequest.encode(
    SendMessageRequest.create({
      content: `loadtest ${Date.now()} ${index}`,
      type: 0,
      targetId: client.targetUser.userId,
      clientMsgId,
    }),
  ).finish();
  const command = Command.create({
    event: ClientToServiceEvent.sendMessage,
    userId: client.user.userId,
    client: 'loadtest',
    payload: [payload],
    requestId,
  });

  const startedAt = performance.now();
  const timeout = setTimeout(() => {
    if (!client.pending.has(clientMsgId)) return;
    client.pending.delete(clientMsgId);
    metrics.ackTimeouts += 1;
  }, stepConfig.ackTimeoutMs);

  client.pending.set(clientMsgId, { startedAt, timeout });
  metrics.sent += 1;
  client.socket.emit('message', Command.encode(command).finish());
}

function handleSocketMessage(client, data, metrics) {
  const command = Command.decode(toUint8Array(data));

  if (command.event !== ServiceToClientEvent.ackSendMessage) {
    if (command.event === ServiceToClientEvent.newUpdateMessage) {
      metrics.broadcasts += 1;
    }
    return;
  }

  const ack = AckSendMessage.decode(command.payload[0]);
  const pending = client.pending.get(ack.clientMsgId);
  if (!pending) return;

  client.pending.delete(ack.clientMsgId);
  clearTimeout(pending.timeout);

  if (ack.status !== 'ok') {
    metrics.ackFailures += 1;
    return;
  }

  metrics.ackSuccess += 1;
  metrics.ackLatencies.push(performance.now() - pending.startedAt);
}

function createMetrics(concurrentUsers) {
  return {
    concurrentUsers,
    connectedUsers: 0,
    sent: 0,
    sendSkipped: 0,
    ackSuccess: 0,
    ackFailures: 0,
    ackTimeouts: 0,
    socketDisconnects: 0,
    socketErrors: 0,
    broadcasts: 0,
    ackLatencies: [],
    errors: [],
  };
}

function summarizeMetrics(label, metrics, stepConfig) {
  const failedMessages = metrics.ackFailures + metrics.ackTimeouts;
  const errorRate = metrics.sent > 0 ? failedMessages / metrics.sent : 1;
  const p50 = percentile(metrics.ackLatencies, 50);
  const p95 = percentile(metrics.ackLatencies, 95);
  const p99 = percentile(metrics.ackLatencies, 99);
  const acceptable =
    metrics.connectedUsers === metrics.concurrentUsers &&
    errorRate <= stepConfig.errorRateLimit &&
    p95 <= stepConfig.p95LimitMs;

  return {
    label,
    concurrentUsers: metrics.concurrentUsers,
    connectedUsers: metrics.connectedUsers,
    sent: metrics.sent,
    ackSuccess: metrics.ackSuccess,
    ackFailures: metrics.ackFailures,
    ackTimeouts: metrics.ackTimeouts,
    socketDisconnects: metrics.socketDisconnects,
    socketErrors: metrics.socketErrors,
    broadcasts: metrics.broadcasts,
    errorRate,
    p50,
    p95,
    p99,
    acceptable,
  };
}

function printStepSummary(summary) {
  console.log({
    users: summary.concurrentUsers,
    connected: summary.connectedUsers,
    sent: summary.sent,
    ackSuccess: summary.ackSuccess,
    ackTimeouts: summary.ackTimeouts,
    socketDisconnects: summary.socketDisconnects,
    errorRate: formatPercent(summary.errorRate),
    p95: formatMs(summary.p95),
    acceptable: summary.acceptable,
  });
}

function printSummaryTable(summaries) {
  console.table(
    summaries.map((summary) => ({
      step: summary.label,
      users: summary.concurrentUsers,
      connected: summary.connectedUsers,
      sent: summary.sent,
      ack_ok: summary.ackSuccess,
      ack_fail: summary.ackFailures,
      ack_timeout: summary.ackTimeouts,
      disconnects: summary.socketDisconnects,
      error_rate: formatPercent(summary.errorRate),
      p50: formatMs(summary.p50),
      p95: formatMs(summary.p95),
      p99: formatMs(summary.p99),
      acceptable: summary.acceptable ? 'yes' : 'no',
    })),
  );
}

async function requestJson(url, body, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Request failed: ${url}. ${error.message}`);
  }

  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : null;
  const allowedStatuses = options.allowStatuses || [200, 201];
  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`Unexpected ${response.status} from ${url}: ${text}`);
  }

  return { response, body: responseBody };
}

function getAccessToken(responseBody) {
  return responseBody?.access_token || responseBody?.data?.access_token || null;
}

function decodeJwtUserId(token) {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('Invalid JWT: missing payload');
  }
  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
    'utf8',
  );
  const parsed = JSON.parse(json);
  if (!parsed.id) {
    throw new Error('Invalid JWT: missing user id');
  }
  return parsed.id;
}

function waitForConnect(socket, email) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Socket connect timeout for ${email}`));
    }, 10_000);

    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(new Error(`Socket connect failed for ${email}: ${error.message}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

async function waitForPendingClients(clients, maxWaitMs) {
  const startedAt = performance.now();

  while (performance.now() - startedAt < maxWaitMs) {
    if (clients.every((client) => client.pending.size === 0)) {
      return;
    }

    await sleep(100);
  }
}

function toUint8Array(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    parsed[rawKey] = inlineValue ?? argv[index + 1];
    if (inlineValue == null) index += 1;
  }

  return parsed;
}

function parseNumberList(value) {
  return String(value)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function validateConfig(value) {
  if (value.steps.length === 0) throw new Error('At least one step is required.');
  if (value.durationMs <= 0) throw new Error('durationMs must be greater than 0.');
  if (value.messageIntervalMs <= 0) throw new Error('messageIntervalMs must be greater than 0.');
  if (value.ackTimeoutMs <= 0) throw new Error('ackTimeoutMs must be greater than 0.');
  if (value.warmupUsers < 2) throw new Error('warmupUsers must be at least 2.');
  if (value.prepareConcurrency <= 0) {
    throw new Error('prepareConcurrency must be greater than 0.');
  }
}

function formatMs(value) {
  return `${Math.round(value)}ms`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

function printHelp() {
  console.log(`
Usage:
  pnpm exec node scripts/loadtest-im.mjs [options]

Options:
  --apiUrl <url>              Default: ${DEFAULT_API_URL}
  --socketUrl <url>           Default: ${DEFAULT_SOCKET_URL}
  --steps <csv>               Default: ${DEFAULT_STEPS.join(',')}
  --durationMs <number>       Default: ${DEFAULT_DURATION_MS}
  --messageIntervalMs <num>   Default: ${DEFAULT_MESSAGE_INTERVAL_MS}
  --ackTimeoutMs <number>     Default: ${DEFAULT_ACK_TIMEOUT_MS}
  --p95LimitMs <number>       Default: ${DEFAULT_P95_LIMIT_MS}
  --errorRateLimit <number>   Default: ${DEFAULT_ERROR_RATE_LIMIT}
  --warmupUsers <number>      Default: ${DEFAULT_WARMUP_USERS}
  --prepareConcurrency <num>  Default: ${DEFAULT_PREPARE_CONCURRENCY}
  --prefix <string>           Default: loadtest_<timestamp>
`);
}
