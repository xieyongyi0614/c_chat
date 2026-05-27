import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SessionService } from './services/session.service';
import { ChunkService } from './services/chunk.service';
import { MergeService } from './services/merge.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { UploadChunkDto } from './dto/upload-chunk.dto';
import { FileService } from './services/file.service';
import { MessageService } from '../../api/chat/services/message.service';

export const UPLOAD_CHAT_NOTIFIER = 'UPLOAD_CHAT_NOTIFIER';

interface UploadChatNotifier {
  notifyNewUploadMessage: (
    message: Awaited<ReturnType<MessageService['sendMessage']>>,
  ) => Promise<void>;
}

@Injectable()
export class UploadService {
  constructor(
    private file: FileService,
    private session: SessionService,
    private chunk: ChunkService,
    private merge: MergeService,
    private messageService: MessageService,
    @Inject(UPLOAD_CHAT_NOTIFIER)
    private chatGateway: UploadChatNotifier,
  ) {}

  async init(dto: InitUploadDto, userId: string) {
    const file = await this.file.findFile({ hash: dto.fileHash, size: dto.fileSize });
    if (file) {
      return { file: this.serializeFile(file) };
    }

    const uploadSession = await this.session.create(dto, userId);
    return { uploadSession: this.serializeUploadSession(uploadSession) };
  }

  async uploadChunk(file: Express.Multer.File, dto: UploadChunkDto) {
    const chunk = await this.chunk.save(dto, file);

    if (chunk.created) {
      await this.session.markUploaded(dto.uploadId, chunk.size);
    }

    return { ok: true };
  }

  async status(uploadId: string) {
    return {
      uploadedChunks: await this.chunk.list(uploadId),
    };
  }

  async complete(uploadId: string, usage: 'file' | 'message' = 'file') {
    const uploadSession = await this.session.findById(uploadId);
    if (!uploadSession) {
      throw new BadRequestException('上传会话不存在');
    }
    const file = uploadSession?.fileId
      ? await this.file.findById(uploadSession.fileId)
      : await this.merge.merge(uploadId);
    if (!file) {
      throw new BadRequestException('上传文件不存在');
    }

    const normalizedFile = this.serializeFile(file);

    if (usage === 'file') {
      return { queued: false, file: normalizedFile };
    }

    if (!uploadSession?.clientMsgId || !uploadSession.conversationId) {
      throw new BadRequestException('上传会话缺少消息上下文');
    }

    const message = await this.messageService.sendMessage({
      senderId: uploadSession.uploaderId,
      conversationId: uploadSession.conversationId,
      content: uploadSession.content ?? '',
      fileId: file.id,
      mediaGroupId: uploadSession.mediaGroupId ?? undefined,
      type: uploadSession.messageType ?? 3,
      clientMsgId: uploadSession.clientMsgId,
      durationSec: uploadSession.duration ?? undefined,
      waveform: uploadSession.waveform ?? undefined,
    });

    await this.chatGateway.notifyNewUploadMessage(message);
    return { queued: false, file: normalizedFile };
  }

  private serializeFile<T extends { size: bigint | number }>(file: T) {
    return { ...file, size: Number(file.size) };
  }

  private serializeUploadSession<
    T extends { fileSize: bigint | number; uploadedBytes?: bigint | number },
  >(uploadSession: T) {
    return {
      ...uploadSession,
      fileSize: Number(uploadSession.fileSize),
      uploadedBytes:
        uploadSession.uploadedBytes == null
          ? uploadSession.uploadedBytes
          : Number(uploadSession.uploadedBytes),
    };
  }
}
