import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigType } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../api/chat/chat.module';
import { UploadModule } from '../modules/upload/upload.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  CoreModule,
  HttpExceptionFilter,
  RESPONSE_INTERCEPTOR_CONFIG,
  ResponseInterceptor,
} from '../core';
import { CommonModule, RequestContextMiddleware } from '../common';
import { AdminModule } from 'src/api/web/admin.module';
import { BullModule } from '@nestjs/bull';
import { AppConfigModule, redisConfig } from '../config';

@Module({
  imports: [
    AppConfigModule,
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        redis: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: 2000,
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),

    CoreModule,
    AuthModule,
    CommonModule,
    ChatModule,

    UploadModule,

    AdminModule,

    // RouterModule.register([{ path: 'web', module: AdminModule }])
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: RESPONSE_INTERCEPTOR_CONFIG,
      useValue: { useStatusCodeAsCode: true, excludePaths: [] },
    },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  /**  */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
