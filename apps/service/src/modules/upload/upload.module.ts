import { forwardRef, Module } from '@nestjs/common';
import { ChatModule } from 'src/api/chat/chat.module';
import { BullModule } from '@nestjs/bull';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SessionService } from './services/session.service';
import { ChunkService } from './services/chunk.service';
import { MergeService } from './services/merge.service';
import { UploadProcessor } from './queue/upload.processor';
import { FileService } from './services/file.service';
import { ChatGateway } from 'src/api/chat/gateways/chat.gateway';
import { UPLOAD_CHAT_NOTIFIER } from './upload.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'upload',
    }),
    forwardRef(() => ChatModule),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    SessionService,
    ChunkService,
    MergeService,
    UploadProcessor,
    FileService,
    {
      provide: UPLOAD_CHAT_NOTIFIER,
      useExisting: ChatGateway,
    },
  ],
  exports: [UploadService, SessionService, ChunkService, MergeService, FileService],
})
export class UploadModule {}
