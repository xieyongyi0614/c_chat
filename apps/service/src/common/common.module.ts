// src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './services/request-context.service';
import { ContextLoggerService } from './services/context-logger.service';

@Global()
@Module({
  providers: [RequestContextService, ContextLoggerService],
  exports: [RequestContextService, ContextLoggerService],
})
export class CommonModule {}
