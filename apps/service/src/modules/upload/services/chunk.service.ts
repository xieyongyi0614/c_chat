import * as path from 'path';
import * as fs from 'fs-extra';
import { Injectable } from '@nestjs/common';
import { UploadChunkDto } from '../dto/upload-chunk.dto';
import { PrismaService } from '../../../core/database/prisma/prisma.service';

@Injectable()
export class ChunkService {
  private base = path.join(process.cwd(), 'uploads', 'chunked');

  constructor(private prisma: PrismaService) {}

  async save(dto: UploadChunkDto, file: Express.Multer.File) {
    const existing = await this.prisma.uploadChunk.findUnique({
      where: {
        uploadId_chunkIndex: {
          uploadId: dto.uploadId,
          chunkIndex: dto.chunkIndex,
        },
      },
    });
    if (existing) return { created: false, size: existing.size ?? 0 };

    const dir = path.join(this.base, dto.uploadId);
    await fs.ensureDir(dir);

    const filePath = path.join(dir, `${dto.chunkIndex}.chunk`);

    if (await fs.pathExists(filePath)) {
      const stat = await fs.stat(filePath);
      await this.prisma.uploadChunk.create({
        data: {
          uploadId: dto.uploadId,
          chunkIndex: dto.chunkIndex,
          size: stat.size,
        },
      });
      return { created: true, size: stat.size };
    }

    if (file && file.buffer) {
      await fs.writeFile(filePath, file.buffer);
      await this.prisma.uploadChunk.create({
        data: {
          uploadId: dto.uploadId,
          chunkIndex: dto.chunkIndex,
          size: file.buffer.length,
        },
      });
      return { created: true, size: file.buffer.length };
    }

    // fallback when multer stored file on disk
    if (file && file.path) {
      await fs.copy(file.path, filePath);
      const stat = await fs.stat(filePath);
      await this.prisma.uploadChunk.create({
        data: {
          uploadId: dto.uploadId,
          chunkIndex: dto.chunkIndex,
          size: stat.size,
        },
      });
      return { created: true, size: stat.size };
    }

    throw new Error('No chunk data');
  }

  async list(uploadId: string) {
    const chunks = await this.prisma.uploadChunk.findMany({
      where: { uploadId },
      select: { chunkIndex: true },
      orderBy: { chunkIndex: 'asc' },
    });
    return chunks.map((chunk) => chunk.chunkIndex);
  }
}
