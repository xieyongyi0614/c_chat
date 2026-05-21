import { PaginationDto } from '../../../../common';
import { IsOptional, IsString } from 'class-validator';

export class UserSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  word?: string;

  @IsOptional()
  @IsString()
  excludeUserId?: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
