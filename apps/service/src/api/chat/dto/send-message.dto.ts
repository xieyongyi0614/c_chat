// import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max } from 'class-validator';

// export class SendMessageDto {
//   @IsString()
//   @IsNotEmpty()
//   room_id: string;

//   @IsString()
//   @IsNotEmpty()
//   content: string;

//   @IsInt()
//   @Min(0)
//   @Max(4)
//   type: number; // 0：文本, 1：图片, 2：文件, 3：音频, 4：视频
// }

// export class JoinRoomDto {
//   @IsString()
//   @IsNotEmpty()
//   room_id: string;
// }

// export class LeaveRoomDto {
//   @IsString()
//   @IsNotEmpty()
//   room_id: string;
// }

// export class TypingDto {
//   @IsString()
//   @IsNotEmpty()
//   room_id: string;

//   @IsOptional()
//   @IsString()
//   is_typing?: string;
// }

export {};
