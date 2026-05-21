import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from './env/loader';
import { envSchema } from './env/schema';
import { redisConfig } from './modules/redis.config';
import { jwtConfig } from './modules/jwt.config';
import { uploadConfig } from './modules/upload.config';
import { dbConfig } from './modules/db.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true, // 提升读取性能
      expandVariables: true, // 支持 ${XXX} 变量引用
      envFilePath: getEnvFilePath(),
      validationSchema: envSchema,
      load: [redisConfig, jwtConfig, uploadConfig, dbConfig],
    }),
  ],
})
export class AppConfigModule {}
