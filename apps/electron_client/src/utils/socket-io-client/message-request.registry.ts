// import { storeTableClass } from '@c_chat/electron_client/db';
// import initOsData from '../osData';
// import { Command } from './proto';
// import {
//   protoMap,
//   SOCKET_PROTO_EVENT,
//   SocketProtoEventData,
//   SocketProtoEventType,
// } from './proto/protoMap';
// import { Socket } from 'socket.io-client';
// import { ClientToServerEvents, ServerToClientEvents } from '.';
// import { v4 as uuidv4 } from 'uuid';
// import { MessageHandlerRegistry } from './message-handler.registry';

// type Deferred<T = any> = {
//   timer: NodeJS.Timeout;
//   resolve: (value: T | PromiseLike<T>) => void;
//   reject: (reason?: any) => void;
// };

// /** 消息命令处理器注册中心 */
// export abstract class MessageRequestRegistry extends MessageHandlerRegistry {
//   private pendingRequests = new Map<string, Deferred>();
//   private static readonly DEFAULT_WAIT_TIMEOUT_MS = 20_000;

//   constructor(protected windowId: number) {
//     super(windowId);
//   }
//   // private _sendMessageToService(event: SocketProtoEventType, encodedData: Uint8Array) {}

//   async genericRequest<TResponse>(
//     event: SocketProtoEventType,
//     encodedData: Uint8Array,
//     requestId: string = uuidv4(),
//   ): Promise<TResponse> {
//     return new Promise<TResponse>((resolve, reject) => {
//       // 创建超时定时器
//       const timer = setTimeout(() => {
//         const entry = this.pendingRequests.get(requestId);
//         if (entry) {
//           this.pendingRequests.delete(requestId);
//           clearTimeout(entry.timer);
//           reject(new Error(`Request ${requestId} timed out.`));
//         }
//       }, MessageRequestRegistry.DEFAULT_WAIT_TIMEOUT_MS);

//       const entry: Deferred<TResponse> = { resolve, reject, timer };
//       this.pendingRequests.set(requestId, entry);

//       try {
//         this._sendMessageToService(event, encodedData);
//       } catch (e) {
//         this.pendingRequests.delete(requestId);
//         clearTimeout(timer);
//         reject(e instanceof Error ? e : new Error(String(e)));
//       }
//     });
//   }
// }
