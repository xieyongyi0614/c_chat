import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadFileDto {
  @ApiProperty({ description: '文件描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '图片alt属性' })
  @IsOptional()
  @IsString()
  alt?: string;
}

export class UploadResponseDto {
  @ApiProperty({ description: '文件ID' })
  id: string;

  @ApiProperty({ description: '文件名' })
  filename: string;

  @ApiProperty({ description: '原始文件名' })
  originalName: string;

  @ApiProperty({ description: 'MIME类型' })
  mimeType: string;

  @ApiProperty({ description: '文件大小（字节）' })
  size: number;

  @ApiProperty({ description: '文件路径' })
  storagePath: string;

  @ApiProperty({ description: '文件URL' })
  url: string;

  @ApiProperty({ description: '图片alt属性', required: false })
  alt: string | null;

  @ApiProperty({ description: '文件描述', required: false })
  description: string | null;

  @ApiProperty({ description: '上传时间' })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}

export class BatchUploadResponseDto {
  @ApiProperty({ description: '成功上传的文件列表', type: [UploadResponseDto] })
  success: UploadResponseDto[];

  @ApiProperty({ description: '失败的文件列表' })
  failed: Array<{
    filename: string;
    error: string;
  }>;

  @ApiProperty({ description: '总文件数' })
  total: number;

  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failedCount: number;
}

export class UploadChunkDto {
  @ApiProperty({ description: '分片上传任务ID' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: '原始文件名' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: '当前分片序号，从 1 开始' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chunkIndex: number;

  @ApiProperty({ description: '总分片数量' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalChunks: number;

  @ApiProperty({ description: '完整文件大小（字节）', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiProperty({ description: '文件描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '图片 alt 属性', required: false })
  @IsOptional()
  @IsString()
  alt?: string;
}

export class UploadChunkResponseDto {
  @ApiProperty({ description: '是否完成最终文件组装' })
  isComplete: boolean;

  @ApiProperty({ description: '分片上传任务 ID' })
  uploadId: string;

  @ApiProperty({ description: '已上传分片数量' })
  uploadedChunks: number;

  @ApiProperty({ description: '总分片数量' })
  totalChunks: number;

  @ApiProperty({ description: '完成后返回的文件信息', type: UploadResponseDto, required: false })
  file?: UploadResponseDto;
}

export class GetFilesQueryDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: '文件类型', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
