// import {
//   Controller,
//   Post,
//   UseInterceptors,
//   UploadedFile,
//   UploadedFiles,
//   Body,
//   UseGuards,
// } from '@nestjs/common';
// import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
// import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// import { UploadService } from './upload.service';
// import {
//   UploadFileDto,
//   UploadResponseDto,
//   BatchUploadResponseDto,
//   UploadChunkDto,
//   UploadChunkResponseDto,
// } from './dto/upload.dto';
// import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
// import { CurrentUser } from '../../../auth';
// import { FileUpload } from './types/upload.types';

// @ApiTags('文件上传管理')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('upload')
// export class UploadController {
//   constructor(private readonly uploadService: UploadService) {}

//   @Post('single')
//   @ApiOperation({ summary: '单文件上传' })
//   @ApiConsumes('multipart/form-data')
//   @ApiResponse({ status: 200, description: '上传成功', type: UploadResponseDto })
//   @UseInterceptors(FileInterceptor('file'))
//   async uploadSingle(
//     @UploadedFile() file: FileUpload,
//     @Body() uploadDto: UploadFileDto,
//     @CurrentUser('id') userId: string,
//   ): Promise<UploadResponseDto> {
//     return this.uploadService.uploadFile(file, userId, uploadDto);
//   }

//   @Post('batch')
//   @ApiOperation({ summary: '批量文件上传' })
//   @ApiConsumes('multipart/form-data')
//   @ApiResponse({ status: 200, description: '批量上传完成', type: BatchUploadResponseDto })
//   @UseInterceptors(FilesInterceptor('files', 10)) // 最多10个文件
//   async uploadBatch(
//     @UploadedFiles() files: FileUpload[],
//     @Body() uploadDto: UploadFileDto,
//     @CurrentUser('id') userId: string,
//   ): Promise<BatchUploadResponseDto> {
//     return this.uploadService.uploadFiles(files, userId);
//   }

//   @Post('chunk')
//   @ApiOperation({ summary: '文件分片上传' })
//   @ApiConsumes('multipart/form-data')
//   @ApiResponse({ status: 200, description: '分片上传成功', type: UploadChunkResponseDto })
//   @UseInterceptors(FileInterceptor('chunk'))
//   async uploadChunk(
//     @UploadedFile() file: FileUpload,
//     @Body() uploadChunkDto: UploadChunkDto,
//     @CurrentUser('id') userId: string,
//   ): Promise<UploadChunkResponseDto> {
//     return this.uploadService.uploadChunk(file, uploadChunkDto, userId);
//   }

//   // @Get()
//   // @ApiOperation({ summary: '获取文件列表' })
//   // @ApiResponse({ status: 200, description: '获取成功' })
//   // async getFiles(@Query() query: GetFilesQueryDto, @CurrentUser('id') userId: string) {
//   //   return this.uploadService.getFiles(query, userId);
//   // }

//   // @Get('all')
//   // @ApiOperation({ summary: '获取所有文件列表（管理员）' })
//   // @ApiResponse({ status: 200, description: '获取成功' })
//   // @UseGuards(RolesGuard)
//   // async getAllFiles(@Query() query: GetFilesQueryDto) {
//   //   return this.uploadService.getFiles(query);
//   // }

//   // @Delete(':id')
//   // @ApiOperation({ summary: '删除文件' })
//   // @ApiResponse({ status: 200, description: '删除成功' })
//   // async deleteFile(
//   //   @Param('id', ParseUUIDPipe) fileId: string,
//   //   @CurrentUser('id') userId: string,
//   //   @CurrentUser('role') userRole: number,
//   // ) {
//   //   // 管理员可以删除任何文件，普通用户只能删除自己的文件
//   //   const uploaderId = userRole === 0 ? undefined : userId;
//   //   await this.uploadService.deleteFile(fileId, uploaderId);
//   //   return { message: '文件删除成功' };
//   // }
// }
