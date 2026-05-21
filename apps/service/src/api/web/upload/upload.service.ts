// import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
// import { PrismaService } from '../../../core/database';
// import * as fs from 'fs-extra';
// import * as path from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import sharp from 'sharp';
// import {
//   UploadFileDto,
//   UploadResponseDto,
//   BatchUploadResponseDto,
//   UploadChunkDto,
//   UploadChunkResponseDto,
// } from './dto/upload.dto';
// import { FileUpload } from './types/upload.types';
// import { MyConfigService } from 'src/config';
// import * as crypto from 'crypto';

// @Injectable()
// export class UploadService {
//   private readonly uploadPath: string;
//   private readonly baseUrl: string;
//   private readonly allowedMimeTypes: string[];
//   private readonly maxFileSize: number;
//   private readonly maxChunkSize: number;
//   private readonly maxChunkedFileSize: number;

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly myConfigService: MyConfigService,
//   ) {
//     const { url, uploadPath } = this.myConfigService.uploadBaseConfig;
//     this.baseUrl = url;
//     this.uploadPath = uploadPath;
//     this.allowedMimeTypes = [
//       // 常见图片格式
//       'image/jpeg',
//       'image/jpg',
//       'image/png',
//       'image/gif',
//       'image/webp',
//       'image/svg+xml',
//       // 常见文档/压缩格式
//       'application/pdf',
//       'application/msword',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       'application/vnd.ms-excel',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'application/vnd.ms-powerpoint',
//       'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//       'text/plain',
//       'application/zip',
//       'application/x-7z-compressed',
//       'application/x-rar-compressed',
//       'application/x-tar',
//       'application/vnd.rar',
//       'application/octet-stream',
//       'video/mp4',
//       'audio/mpeg',
//       'audio/mp3',
//       'audio/wav',
//     ];
//     this.maxFileSize = 200 * 1024 * 1024; // 200MB
//     this.maxChunkSize = 10 * 1024 * 1024; // 10MB
//     this.maxChunkedFileSize = 500 * 1024 * 1024; // 500MB
//   }

//   private isSupportedMimeType(mimeType: string): boolean {
//     return this.isImageFile(mimeType) || this.allowedMimeTypes.includes(mimeType);
//   }

//   /**
//    * 单文件上传
//    */
//   async uploadFile(
//     file: FileUpload,
//     uploaderId: string,
//     uploadDto?: UploadFileDto,
//   ): Promise<UploadResponseDto> {
//     try {
//       this.validateFile(file);

//       const fileHash = await this.calculateFileHash(file.buffer);

//       const existingFile = await this.findExistingFileByHash(fileHash);
//       if (existingFile) {
//         return existingFile;
//       }

//       const { filename, fileSize, filePath } = await this.saveFile(file);

//       // 保存到数据库
//       const savedFile = await this.prisma.file.create({
//         data: {
//           hash: fileHash,
//           filename,
//           originalName: file.originalname,
//           mimeType: file.mimetype,
//           fileType: 0,
//           size: fileSize,
//           storagePath: filePath,
//           url: `${this.baseUrl}/${filePath}`,
//           alt: uploadDto?.alt,
//           description: uploadDto?.description,
//           uploaderId,
//         },
//       });

//       return savedFile;
//     } catch (error) {
//       throw new InternalServerErrorException(`文件上传失败: ${(error as Error)?.message}`);
//     }
//   }

//   /**
//    * 批量文件上传
//    */
//   async uploadFiles(files: FileUpload[], uploaderId: string): Promise<BatchUploadResponseDto> {
//     const results: BatchUploadResponseDto = {
//       success: [],
//       failed: [],
//       total: files.length,
//       successCount: 0,
//       failedCount: 0,
//     };

//     for (const file of files) {
//       try {
//         const result = await this.uploadFile(file, uploaderId);
//         results.success.push(result);
//         results.successCount++;
//       } catch (error) {
//         results.failed.push({
//           filename: file.originalname,
//           error: (error as Error).message,
//         });
//         results.failedCount++;
//       }
//     }

//     return results;
//   }

//   /**
//    * 获取文件列表
//    */
//   // async getFiles(query: GetFilesQueryDto, uploaderId?: string) {
//   //   const { page = 1, limit = 10, search, mimeType } = query;
//   //   const skip = (page - 1) * limit;

//   //   const where: Record<string, unknown> = {};

//   //   if (uploaderId) {
//   //     where.uploaderId = uploaderId;
//   //   }

//   //   if (search) {
//   //     where.OR = [
//   //       { originalName: { contains: search } },
//   //       { description: { contains: search } },
//   //       { alt: { contains: search } },
//   //     ];
//   //   }

//   //   if (mimeType) {
//   //     where.mimeType = { contains: mimeType };
//   //   }

//   //   const [files, total] = await Promise.all([
//   //     this.prisma.media.findMany({
//   //       where,
//   //       skip,
//   //       take: limit,
//   //       orderBy: { createdAt: 'desc' },
//   //       include: {
//   //         uploader: {
//   //           select: {
//   //             id: true,
//   //             username: true,
//   //             email: true,
//   //           },
//   //         },
//   //       },
//   //     }),
//   //     this.prisma.media.count({ where }),
//   //   ]);

//   //   return {
//   //     files,
//   //     pagination: {
//   //       page,
//   //       limit,
//   //       total,
//   //       totalPages: Math.ceil(total / limit),
//   //     },
//   //   };
//   // }

//   /**
//    * 删除文件
//    */
//   // async deleteFile(fileId: string, uploaderId?: string): Promise<void> {
//   //   const where: Record<string, unknown> = { id: fileId };
//   //   if (uploaderId) {
//   //     where.uploaderId = uploaderId;
//   //   }

//   //   const file = await this.prisma.media.findFirst({ where });
//   //   if (!file) {
//   //     throw new BadRequestException('文件不存在');
//   //   }

//   //   try {
//   //     // 删除物理文件
//   //     if (await fs.pathExists(file.path)) {
//   //       await fs.remove(file.path);
//   //     }

//   //     // 删除数据库记录
//   //     await this.prisma.media.delete({ where: { id: fileId } });
//   //   } catch (error) {
//   //     throw new InternalServerErrorException(`文件删除失败: ${error.message}`);
//   //   }
//   // }

//   /**
//    * 验证文件
//    */
//   private validateFile(file: FileUpload): void {
//     if (!file) {
//       throw new BadRequestException('没有上传文件');
//     }

//     if (file.size > this.maxFileSize) {
//       throw new BadRequestException(`文件大小不能超过 ${this.maxFileSize / 1024 / 1024}MB`);
//     }

//     if (!this.isSupportedMimeType(file.mimetype)) {
//       throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
//     }
//   }

//   /**
//    * 确保上传目录存在
//    */
//   private async ensureUploadDirectory(dirPath: string): Promise<void> {
//     try {
//       await fs.ensureDir(dirPath);
//     } catch (error) {
//       throw new InternalServerErrorException('创建上传目录失败');
//     }
//   }

//   /**
//    * 判断是否为图片文件
//    */
//   private isImageFile(mimeType: string): boolean {
//     return mimeType.startsWith('image/');
//   }

//   /**
//    * 处理图片文件（压缩和优化）
//    */
//   private async processImage(buffer: Buffer): Promise<Buffer> {
//     try {
//       return await sharp(buffer)
//         .jpeg({ quality: 85 })
//         .png({ quality: 85 })
//         .webp({ quality: 85 })
//         .toBuffer();
//     } catch (error) {
//       // 如果处理失败，返回原始buffer
//       return buffer;
//     }
//   }

//   /**
//    * 计算文件哈希值
//    */
//   private async calculateFileHash(buffer: Buffer): Promise<string> {
//     return new Promise((resolve) => {
//       const hash = crypto.createHash('sha256');
//       hash.update(buffer);
//       resolve(hash.digest('hex'));
//     });
//   }

//   /**
//    * 检查文件是否已存在（基于哈希值）
//    */
//   private async findExistingFileByHash(fileHash: string) {
//     return await this.prisma.file.findFirst({
//       where: { hash: fileHash },
//     });
//   }
//   private async saveFile(file: FileUpload) {
//     // 生成按时间分层的目录结构 (年/月/日)
//     const now = new Date();
//     const year = now.getFullYear().toString();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const timeSubDir = path.join(year, month, day);

//     const timeDirPath = path.join(this.uploadPath, timeSubDir);
//     await this.ensureUploadDirectory(timeDirPath);

//     const fileExtension = path.extname(file.originalname);
//     const filename = `${uuidv4()}${fileExtension}`;
//     const filePath = path.join(timeDirPath, filename);

//     let processedBuffer = file.buffer;
//     if (this.isImageFile(file.mimetype)) {
//       processedBuffer = await this.processImage(file.buffer);
//     }

//     await fs.writeFile(filePath, processedBuffer);
//     return { filename, fileSize: processedBuffer.length, filePath };
//   }

//   async uploadChunk(
//     chunk: FileUpload,
//     uploadChunkDto: UploadChunkDto,
//     uploaderId: string,
//   ): Promise<UploadChunkResponseDto> {
//     if (!chunk) {
//       throw new BadRequestException('没有上传文件分片');
//     }

//     if (!uploadChunkDto?.uploadId) {
//       throw new BadRequestException('缺少 uploadId');
//     }

//     if (!uploadChunkDto?.fileName) {
//       throw new BadRequestException('缺少 fileName');
//     }

//     if (chunk.size > this.maxChunkSize) {
//       throw new BadRequestException(`单个分片不能超过 ${this.maxChunkSize / 1024 / 1024} MB`);
//     }

//     if (uploadChunkDto.fileSize && uploadChunkDto.fileSize > this.maxChunkedFileSize) {
//       throw new BadRequestException(
//         `分片上传文件总大小不能超过 ${this.maxChunkedFileSize / 1024 / 1024} MB`,
//       );
//     }

//     const chunkDir = path.join(this.uploadPath, 'chunked', uploadChunkDto.uploadId);
//     await this.ensureUploadDirectory(chunkDir);
//     const partFilePath = path.join(chunkDir, `${uploadChunkDto.uploadId}.part`);

//     if (uploadChunkDto.chunkIndex === 1 && (await fs.pathExists(partFilePath))) {
//       await fs.remove(partFilePath);
//     }

//     await fs.appendFile(partFilePath, chunk.buffer);

//     const isComplete = uploadChunkDto.chunkIndex >= uploadChunkDto.totalChunks;

//     if (!isComplete) {
//       return {
//         isComplete: false,
//         uploadId: uploadChunkDto.uploadId,
//         uploadedChunks: uploadChunkDto.chunkIndex,
//         totalChunks: uploadChunkDto.totalChunks,
//       };
//     }

//     const assembledBuffer = await fs.readFile(partFilePath);
//     const finalFile: FileUpload = {
//       ...chunk,
//       originalname: uploadChunkDto.fileName,
//       buffer: assembledBuffer,
//       size: assembledBuffer.length,
//     };

//     const savedFile = await this.uploadFile(finalFile, uploaderId, {
//       alt: uploadChunkDto.alt,
//       description: uploadChunkDto.description,
//     });

//     await fs.remove(chunkDir);

//     return {
//       isComplete: true,
//       uploadId: uploadChunkDto.uploadId,
//       uploadedChunks: uploadChunkDto.chunkIndex,
//       totalChunks: uploadChunkDto.totalChunks,
//       file: savedFile,
//     };
//   }
// }
