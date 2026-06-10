import { INestApplicationContext, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, ServerOptions } from 'socket.io';
import { redisConfig } from '../config';

export class RedisSocketIoAdapter extends IoAdapter implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisSocketIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redis = this.app.get<ConfigType<typeof redisConfig>>(redisConfig.KEY);
    if (!redis.socketIoAdapterEnabled) {
      return;
    }

    const options = {
      host: redis.host,
      port: redis.port,
      password: redis.password || undefined,
      lazyConnect: true,
    };
    const pubClient = new Redis(options);
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.pubClient = pubClient;
    this.subClient = subClient;
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.io Redis adapter enabled');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.pubClient?.quit(), this.subClient?.quit()]);
  }
}
