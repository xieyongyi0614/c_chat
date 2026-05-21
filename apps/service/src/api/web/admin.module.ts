import { Module } from '@nestjs/common';
import { UserController } from './users';
import { AuthModule } from '../../auth';
import { UsersService } from './users/users.service';
// import { UploadController } from './upload/upload.controller';
// import { UploadService } from './upload/upload.service';

@Module({
  controllers: [UserController],
  imports: [AuthModule],
  providers: [UsersService],
})
export class AdminModule {}
