import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { ChatSocket } from 'src/types/socket.types';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<ChatSocket>();
    const jwtPayload = await this.authService.authenticateSocket(client);
    // console.log('WsJwtAuthGuard', client.data);
    client.data.user = jwtPayload;
    return true;
  }
}
