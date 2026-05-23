import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class UploadChunkDto {
  @IsString()
  uploadId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  chunkIndex: number;
}
