import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { InitUploadDto } from '../dto/init-upload.dto';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: InitUploadDto, userId: string) {
    const totalChunks = Math.ceil(dto.fileSize / dto.chunkSize);

    return this.prisma.uploadSession.create({
      data: {
        fileName: dto.fileName,
        fileHash: dto.fileHash,
        fileSize: BigInt(dto.fileSize),
        mimeType: dto.mimeType,
        chunkSize: dto.chunkSize,
        totalChunks,
        uploaderId: userId,
        clientMsgId: dto.clientMsgId,
        conversationId: dto.conversationId,
        messageType: dto.messageType,
        mediaGroupId: dto.mediaGroupId,
        content: dto.content,
        duration: dto.duration,
        waveform: dto.waveform,
        status: 0,
      },
    });
  }

  async findById(uploadId: string) {
    return this.prisma.uploadSession.findUnique({ where: { id: uploadId } });
  }

  async markUploaded(uploadId: string, chunkSize: number) {
    return this.prisma.uploadSession.update({
      where: { id: uploadId },
      data: {
        uploadedCount: { increment: 1 },
        uploadedBytes: { increment: chunkSize },
        status: 1,
      },
    });
  }

  async setMerging(uploadId: string) {
    return this.prisma.uploadSession.update({
      where: { id: uploadId },
      data: { status: 2 },
    });
  }

  async setSuccess(uploadId: string) {
    return this.prisma.uploadSession.update({
      where: { id: uploadId },
      data: { status: 3 },
    });
  }

  async setFile(uploadId: string, fileId: string) {
    return this.prisma.uploadSession.update({
      where: { id: uploadId },
      data: { fileId },
    });
  }
}
