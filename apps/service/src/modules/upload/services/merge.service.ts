import * as path from 'path';
import * as fs from 'fs-extra';
import { pipeline } from 'stream/promises';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { SessionService } from './session.service';

function guessMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

@Injectable()
export class MergeService {
  private base = path.join(process.cwd(), 'uploads');

  constructor(
    private prisma: PrismaService,
    private session: SessionService,
  ) {}

  async merge(uploadId: string) {
    const s = await this.prisma.uploadSession.findUnique({ where: { id: uploadId } });
    if (!s) throw new Error('upload session not found');

    await this.session.setMerging(uploadId);

    const chunkDir = path.join(this.base, 'chunked', uploadId);

    const date = s.createTime ? new Date(s.createTime) : new Date();
    const dayFolder = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const finalDir = path.join(this.base, dayFolder);
    await fs.ensureDir(finalDir);

    const extWithDot = path.extname(s.fileName) ?? '';
    const finalPath = path.join(finalDir, `${uploadId}${extWithDot}`);
    const tempPath = `${finalPath}.tmp`;

    for (let i = 0; i < s.totalChunks; i++) {
      const chunk = path.join(chunkDir, `${i}.chunk`);
      if (!(await fs.pathExists(chunk))) {
        throw new Error(`missing chunk ${i}`);
      }
    }

    const write = fs.createWriteStream(tempPath);
    const finished = new Promise<void>((resolve, reject) => {
      write.on('finish', resolve);
      write.on('error', reject);
    });

    for (let i = 0; i < s.totalChunks; i++) {
      const chunk = path.join(chunkDir, `${i}.chunk`);
      await pipeline(fs.createReadStream(chunk), write, { end: false });
    }

    write.end();
    await finished;
    await fs.move(tempPath, finalPath, { overwrite: true });

    const stat = await fs.stat(finalPath);
    const ext = extWithDot ? extWithDot.slice(1).toLowerCase() : null;

    const file = await this.prisma.file.upsert({
      where: { hash: s.fileHash },
      create: {
        fileName: s.fileName,
        hash: s.fileHash,
        mimeType: s.mimeType ?? guessMimeType(s.fileName),
        ext,
        size: BigInt(stat.size),
        url: `/uploads/${dayFolder}/${path.basename(finalPath)}`,
        uploaderId: s.uploaderId,
      },
      update: {},
    });

    await this.session.setSuccess(uploadId);
    await this.session.setFile(uploadId, file.id);

    await fs.remove(chunkDir);

    return file;
  }
}
