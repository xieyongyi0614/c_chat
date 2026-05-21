import { Module } from '@nestjs/common';
import { ChatModule } from 'src/api/chat/chat.module';
import { BullModule } from '@nestjs/bull';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SessionService } from './services/session.service';
import { ChunkService } from './services/chunk.service';
import { MergeService } from './services/merge.service';
import { UploadProcessor } from './queue/upload.processor';
import { FileService } from './services/file.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'upload',
    }),
    ChatModule,
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    SessionService,
    ChunkService,
    MergeService,
    UploadProcessor,
    FileService,
  ],
  exports: [UploadService, SessionService, ChunkService, MergeService, FileService],
})
export class UploadModule {}
