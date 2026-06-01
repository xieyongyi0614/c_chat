import type { Socket } from 'socket.io-client';

export interface ServerToClientEvents {
  message: (data: ArrayBuffer | ArrayBufferView) => void;
  auth_error: (data: { message: string; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  message: (data: Uint8Array<ArrayBufferLike>) => void;
}

export type CChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
