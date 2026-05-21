import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 1), { toClassOnly: true })
  page = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  @Transform(({ value }) => (value ? Number(value) : 10), { toClassOnly: true })
  pageSize = 10;
}
export class RequestListParams {
  pagination?: PaginationDto;
  @IsOptional()
  word = '';
}
