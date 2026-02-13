import io, { Socket, } from 'socket.io-client';
import { BrowserWindow } from 'electron';


type SocketOptions = Parameters<typeof io>[1];



export class SocketIOClient {
  private socket: Socket | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(
    private url: string,
    private options: SocketOptions = {}
  ) { }

  connect(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    this.socket = io(this.url, {
      transports: ['websocket'], // 优先 WebSocket
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 20000,
      ...this.options
    });

    this.socket.on('connect', () => {
      console.log('[Socket.IO] Connected, ID:', this.socket?.id);

      // 通知渲染进程
      this.mainWindow?.webContents.send('socket-connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      this.mainWindow?.webContents.send('socket-disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection Error:', error);
    });

    // 监听所有事件并转发给渲染进程
    this.socket.onAny((event, ...args) => {
      if (!['connect', 'disconnect', 'connect_error'].includes(event)) {
        this.mainWindow?.webContents.send('socket-event', { event, args });
      }
    });
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string): void {
    this.socket?.off(event);
  }

  disconnect(): void {
    this.socket?.disconnect();
  }
}

// // 使用示例
// const socketClient = new SocketIOClient('http://localhost:3000');
// socketClient.connect(mainWindow);

// // 发送消息
// socketClient.emit('send-message', {
//   userId: 'user123',
//   content: 'Hello from Electron!'
// });