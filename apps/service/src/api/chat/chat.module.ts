import { Module } from '@nestjs/common';
import { ChatGateway } from './gateways/chat.gateway';
import { MessageService } from './services/message.service';
import { ChatService } from './services/chat.service';
import { AuthModule } from '../../auth/auth.module';
import { UsersService } from 'src/api/web/users/users.service';

@Module({
  imports: [AuthModule],
  providers: [ChatGateway, MessageService, ChatService, UsersService],
  exports: [ChatGateway, MessageService, ChatService],
})
export class ChatModule {}
