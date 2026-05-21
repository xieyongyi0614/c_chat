import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SessionService } from './services/session.service';
import { ChunkService } from './services/chunk.service';
import { MergeService } from './services/merge.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { UploadChunkDto } from './dto/upload-chunk.dto';
import { FileService } from './services/file.service';

@Injectable()
export class UploadService {
  constructor(
    private file: FileService,
    private session: SessionService,
    private chunk: ChunkService,
    private merge: MergeService,
    @InjectQueue('upload') private queue: Queue,
  ) {}

  async init(dto: InitUploadDto, userId: string) {
    const file = await this.file.findFile({ hash: dto.fileHash, size: dto.fileSize });
    if (file) {
      return { file: { ...file, size: Number(file.size) } };
    }

    const uploadSession = await this.session.create(dto, userId);
    return { uploadSession: { ...uploadSession, fileSize: Number(uploadSession.fileSize) } };
  }

  async uploadChunk(file: Express.Multer.File, dto: UploadChunkDto) {
    await this.chunk.save(dto, file);

    await this.session.markUploaded(dto.uploadId);

    return { ok: true };
  }

  async status(uploadId: string) {
    return {
      uploadedChunks: await this.chunk.list(uploadId),
    };
  }

  async complete(uploadId: string, usage: 'file' | 'message' = 'file') {
    if (usage === 'message') {
      await this.queue.add('merge-message', { uploadId });
      return { queued: true };
    }

    const file = await this.merge.merge(uploadId);
    return { queued: false, file: { ...file, size: Number(file.size) } };
  }
}
