import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { CheckFileHashDto } from '../dto/file.dto';

@Injectable()
export class FileService {
  constructor(private prisma: PrismaService) {}

  async findFile(data: CheckFileHashDto) {
    const { hash, size } = data;
    return this.prisma.file.findUnique({ where: { hash, size } });
  }
}
