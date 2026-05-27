import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { UploadChunkDto } from './dto/upload-chunk.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CheckFileHashDto } from './dto/file.dto';
import { FileService } from './services/file.service';
import { JwtAuthGuard } from 'src/auth';
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private uploadService: UploadService,
    private fileService: FileService,
  ) {}

  @Post('init')
  init(@Body() dto: InitUploadDto, @CurrentUser('id') userId: string) {
    return this.uploadService.init(dto, userId);
  }

  @Post('chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  uploadChunk(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadChunkDto) {
    return this.uploadService.uploadChunk(file, dto);
  }

  @Get('status')
  status(@Query('uploadId') uploadId: string) {
    return this.uploadService.status(uploadId);
  }

  @Post('complete')
  complete(@Body('uploadId') uploadId: string, @Body('usage') usage?: 'file' | 'message') {
    return this.uploadService.complete(uploadId, usage);
  }

  @Post('getFileByHash')
  async checkFingerprint(@Body() body: CheckFileHashDto) {
    const file = await this.fileService.findFile(body);
    return { ...file, size: Number(file?.size) };
  }
}
