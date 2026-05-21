import { Socket } from 'socket.io';
import { AuthTypes } from './api/users-types';

interface SocketData {
  user: AuthTypes.JWTPayload;
}
export interface ChatSocket extends Socket {
  data: SocketData;
}
