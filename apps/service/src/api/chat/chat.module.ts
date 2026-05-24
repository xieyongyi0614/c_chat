import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './gateways/chat.gateway';
import { MessageService } from './services/message.service';
import { ChatService } from './services/chat.service';
import { AuthModule } from '../../auth/auth.module';
import { UsersService } from 'src/api/web/users/users.service';
import { UploadModule } from 'src/modules/upload/upload.module';
import { CallService } from '../call/call.service';

@Module({
  imports: [AuthModule, forwardRef(() => UploadModule)],
  providers: [ChatGateway, MessageService, ChatService, UsersService, CallService],
  exports: [ChatGateway, MessageService, ChatService, CallService],
})
export class ChatModule {}
