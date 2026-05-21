import * as path from 'path';
import * as fs from 'fs-extra';
import { Injectable } from '@nestjs/common';
import { UploadChunkDto } from '../dto/upload-chunk.dto';

@Injectable()
export class ChunkService {
  private base = path.join(process.cwd(), 'uploads', 'chunked');

  async save(dto: UploadChunkDto, file: Express.Multer.File) {
    const dir = path.join(this.base, dto.uploadId);
    await fs.ensureDir(dir);

    const filePath = path.join(dir, `${dto.chunkIndex}.chunk`);

    if (await fs.pathExists(filePath)) return;

    if (file && file.buffer) {
      await fs.writeFile(filePath, file.buffer);
      return;
    }

    // fallback when multer stored file on disk
    if (file && file.path) {
      await fs.copy(file.path, filePath);
      return;
    }

    throw new Error('No chunk data');
  }

  async list(uploadId: string) {
    const dir = path.join(this.base, uploadId);
    if (!(await fs.pathExists(dir))) return [];

    const files = await fs.readdir(dir);

    return files
      .map((f) => Number(f.split('.')[0]))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
  }
}
