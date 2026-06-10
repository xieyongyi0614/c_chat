import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD!,
  socketIoAdapterEnabled: process.env.SOCKET_IO_REDIS_ADAPTER_ENABLED === 'true',
}));
