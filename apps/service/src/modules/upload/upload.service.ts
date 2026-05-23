import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  private static readonly REDIS_CHECK_TIMEOUT_MS = 1500;
  private static readonly REDIS_ADD_TIMEOUT_MS = 3000;

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
      await this.ensureQueueAvailable();
      await this.withTimeout(
        this.queue.add('merge-message', { uploadId }),
        UploadService.REDIS_ADD_TIMEOUT_MS,
        'Redis unavailable while queueing upload merge',
      );
      return { queued: true };
    }

    const file = await this.merge.merge(uploadId);
    return { queued: false, file: { ...file, size: Number(file.size) } };
  }

  private async ensureQueueAvailable() {
    if (this.queue.client.status === 'end') {
      throw new ServiceUnavailableException('Redis 未启动，无法排队合并文件');
    }

    await this.withTimeout(
      this.queue.client.ping(),
      UploadService.REDIS_CHECK_TIMEOUT_MS,
      'Redis 未连接，无法排队合并文件',
    );
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new ServiceUnavailableException(message)), timeoutMs);
        }),
      ]);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(message);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
