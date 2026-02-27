// src/main/utils/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { app } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { env } from '../env';

// ==================== 安全获取日志目录 ====================
const getLogsDir = (): string => {
  try {
    if (!app.isReady()) return path.join(os.tmpdir(), 'c-chat-logs');

    const baseDir = env.isDev ? path.join(os.tmpdir(), 'c-chat-dev-logs') : app.getPath('logs');

    const logsDir = path.join(baseDir, 'c-chat');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  } catch (error) {
    console.error('[Logger] Failed to create logs dir:', error);
    return path.join(os.tmpdir(), 'c-chat-fallback-logs');
  }
};

// ==================== 无 chalk 的安全控制台格式 ====================
const consoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  // 安全级别映射（无颜色依赖）
  const levelMap: Record<string, string> = {
    error: '[ERROR] ',
    warn: '[WARN]  ',
    success: '[OK]    ',
    info: '[INFO]  ',
    http: '[HTTP]  ',
    debug: '[DEBUG] ',
  };

  // 敏感信息过滤
  let safeMsg = String(message || '');
  if (/(token|password|secret|key)/i.test(safeMsg)) {
    safeMsg = safeMsg.replace(
      /(token|password|secret|key)["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
      '$1:***REDACTED***',
    );
  }

  // 元数据处理
  const metaStr = Object.keys(meta).length
    ? ` ${JSON.stringify(meta, null, 2).replace(/\n/g, ' ')}`
    : '';

  // 安全获取级别前缀
  const levelPrefix = levelMap[level?.toLowerCase()] || `[${level}] `;

  return `[${timestamp}] ${levelPrefix}${safeMsg}${metaStr}`;
});

// ==================== 文件日志格式（JSON） ====================
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// ==================== 传输器 ====================
const createTransports = () => {
  const transports: winston.transport[] = [];
  const isDev = process.env.NODE_ENV === 'development';

  // 🖥️ 控制台（仅开发环境）
  if (isDev) {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          consoleFormat,
        ),
      }),
    );
  }

  // 📁 文件日志（所有环境）
  try {
    const logsDir = getLogsDir();

    // 错误日志
    transports.push(
      new DailyRotateFile({
        level: 'error',
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),
    );

    // 全量日志（生产环境）
    if (!isDev) {
      transports.push(
        new DailyRotateFile({
          filename: path.join(logsDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '50m',
          maxFiles: '30d',
          format: fileFormat,
        }),
      );
    }
  } catch (error) {
    console.warn('[Logger] File transports disabled:', error);
  }

  return transports;
};

// ==================== Logger 实例 ====================
const logger = winston.createLogger({
  levels: { error: 0, warn: 1, success: 2, info: 3, http: 4, debug: 5 },
  transports: createTransports(),
  exitOnError: false,
});

// ==================== 扩展方法（类型安全） ====================
type LoggerWithMethods = typeof logger & {
  success: (message: string, ...meta: any[]) => void;
  http: (message: string, ...meta: any[]) => void;
};

(logger as any).success = (msg: string, ...meta: any[]) => logger.log('success', msg, ...meta);

(logger as any).http = (msg: string, ...meta: any[]) => logger.log('http', msg, ...meta);

// ==================== 全局错误捕获 ====================
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION', { stack: error.stack });
  app.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('UNHANDLED REJECTION', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
  });
});

// ==================== 导出 ====================
export { logger };
export default logger as LoggerWithMethods;
