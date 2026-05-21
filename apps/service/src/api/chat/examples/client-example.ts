// /**
//  * Socket.IO 聊天客户端使用示例
//  *
//  * 这个文件展示了如何在客户端使用 Socket.IO 连接到聊天服务
//  * 注意：这是一个 TypeScript 示例，实际使用时需要根据你的前端框架进行调整
//  */

// import { io, Socket } from 'socket.io-client';

// // ==================== 基础连接示例 ====================

// /**
//  * 方式1: 通过 auth.token 传递 Token
//  */
// const socket1 = io('http://localhost:3001/chat', {
//   auth: {
//     token: 'your-jwt-token-here'
//   }
// });

// /**
//  * 方式2: 通过 query.token 传递 Token
//  */
// const socket2 = io('http://localhost:3001/chat', {
//   query: {
//     token: 'your-jwt-token-here'
//   }
// });

// /**
//  * 方式3: 通过 Authorization header 传递 Token
//  */
// const socket3 = io('http://localhost:3001/chat', {
//   extraHeaders: {
//     Authorization: 'Bearer your-jwt-token-here'
//   }
// });

// // ==================== 完整聊天客户端类 ====================

// interface Message {
//   id: string;
//   room_id: string;
//   sender_id: string;
//   content: string;
//   type: number;
//   is_read: number;
//   state: number;
//   create_time: string;
//   user: {
//     id: string;
//     nickname: string | null;
//     avatar_url: string | null;
//   };
// }

// interface MessagesHistoryResponse {
//   room_id: string;
//   messages: Message[];
//   total: number;
//   page: number;
//   pageSize: number;
// }

// class ChatClient {
//   private socket: Socket;
//   private serverUrl: string;
//   private token: string;

//   constructor(serverUrl: string, token: string) {
//     this.serverUrl = serverUrl;
//     this.token = token;
//     this.socket = io(`${serverUrl}/chat`, {
//       auth: { token },
//       transports: ['websocket'],
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionAttempts: 5
//     });

//     this.setupEventListeners();
//   }

//   /**
//    * 设置事件监听器
//    */
//   private setupEventListeners() {
//     // 连接成功
//     this.socket.on('connect', () => {
//       console.log('✅ 已连接到聊天服务器');
//       console.log('Socket ID:', this.socket.id);
//     });

//     // 连接错误
//     this.socket.on('connect_error', (error) => {
//       console.error('❌ 连接失败:', error.message);
//     });

//     // 断开连接
//     this.socket.on('disconnect', (reason) => {
//       console.log('🔌 已断开连接:', reason);
//     });

//     // 重新连接
//     this.socket.on('reconnect', (attemptNumber) => {
//       console.log('🔄 重新连接成功，尝试次数:', attemptNumber);
//     });

//     // 新消息
//     this.socket.on('new_message', (message: Message) => {
//       console.log('📨 收到新消息:', message);
//       this.onNewMessage(message);
//     });

//     // 消息历史
//     this.socket.on('messages_history', (data: MessagesHistoryResponse) => {
//       console.log('📜 消息历史:', data);
//       this.onMessagesHistory(data);
//     });

//     // 用户加入
//     this.socket.on('user_joined', (data) => {
//       console.log('👤 用户加入:', data);
//       this.onUserJoined(data);
//     });

//     // 用户离开
//     this.socket.on('user_left', (data) => {
//       console.log('👋 用户离开:', data);
//       this.onUserLeft(data);
//     });

//     // 用户正在输入
//     this.socket.on('user_typing', (data) => {
//       console.log('⌨️ 用户正在输入:', data);
//       this.onUserTyping(data);
//     });

//     // 消息已撤回
//     this.socket.on('message_recalled', (data) => {
//       console.log('🗑️ 消息已撤回:', data);
//       this.onMessageRecalled(data);
//     });

//     // 错误
//     this.socket.on('error', (error) => {
//       console.error('❌ 错误:', error);
//       this.onError(error);
//     });
//   }

//   // ==================== 事件处理方法（可重写） ====================

//   protected onNewMessage(message: Message) {
//     // 子类可以重写此方法处理新消息
//   }

//   protected onMessagesHistory(data: MessagesHistoryResponse) {
//     // 子类可以重写此方法处理消息历史
//   }

//   protected onUserJoined(data: { room_id: string; user_id: string; message: string }) {
//     // 子类可以重写此方法处理用户加入
//   }

//   protected onUserLeft(data: { room_id: string; user_id: string; message: string }) {
//     // 子类可以重写此方法处理用户离开
//   }

//   protected onUserTyping(data: { room_id: string; user_id: string; is_typing: boolean }) {
//     // 子类可以重写此方法处理用户输入状态
//   }

//   protected onMessageRecalled(data: { message_id: string; room_id: string }) {
//     // 子类可以重写此方法处理消息撤回
//   }

//   protected onError(error: { message: string }) {
//     // 子类可以重写此方法处理错误
//   }

//   // ==================== 公共方法 ====================

//   /**
//    * 加入聊天室
//    */
//   joinRoom(roomId: string) {
//     this.socket.emit('join_room', { room_id: roomId });
//   }

//   /**
//    * 离开聊天室
//    */
//   leaveRoom(roomId: string) {
//     this.socket.emit('leave_room', { room_id: roomId });
//   }

//   /**
//    * 发送消息
//    * @param roomId 房间ID
//    * @param content 消息内容
//    * @param type 消息类型：0-文本, 1-图片, 2-文件, 3-音频, 4-视频
//    */
//   sendMessage(roomId: string, content: string, type: number = 0) {
//     this.socket.emit('send_message', {
//       room_id: roomId,
//       content,
//       type
//     });
//   }

//   /**
//    * 获取消息历史
//    */
//   getMessages(roomId: string, page: number = 1, pageSize: number = 50) {
//     this.socket.emit('get_messages', {
//       room_id: roomId,
//       page,
//       page_size: pageSize
//     });
//   }

//   /**
//    * 撤回消息
//    */
//   recallMessage(messageId: string) {
//     this.socket.emit('recall_message', { message_id: messageId });
//   }

//   /**
//    * 标记消息已读
//    */
//   markAsRead(messageId: string) {
//     this.socket.emit('mark_read', { message_id: messageId });
//   }

//   /**
//    * 发送正在输入状态
//    */
//   typing(roomId: string, isTyping: boolean) {
//     this.socket.emit('typing', {
//       room_id: roomId,
//       is_typing: isTyping.toString()
//     });
//   }

//   /**
//    * 断开连接
//    */
//   disconnect() {
//     this.socket.disconnect();
//   }

//   /**
//    * 获取 Socket 实例（用于高级用法）
//    */
//   getSocket(): Socket {
//     return this.socket;
//   }

//   /**
//    * 检查是否已连接
//    */
//   isConnected(): boolean {
//     return this.socket.connected;
//   }
// }

// // ==================== 使用示例 ====================

// // 创建客户端实例
// const chatClient = new ChatClient('http://localhost:3001', 'your-jwt-token');

// // 等待连接成功后进行操作
// chatClient.getSocket().on('connect', () => {
//   // 加入聊天室
//   chatClient.joinRoom('room-id-123');

//   // 发送文本消息
//   chatClient.sendMessage('room-id-123', 'Hello, World!', 0);

//   // 发送图片消息
//   chatClient.sendMessage('room-id-123', 'https://example.com/image.jpg', 1);

//   // 获取消息历史
//   chatClient.getMessages('room-id-123', 1, 50);

//   // 发送正在输入状态
//   chatClient.typing('room-id-123', true);

//   // 3秒后停止输入状态
//   setTimeout(() => {
//     chatClient.typing('room-id-123', false);
//   }, 3000);
// });

// // ==================== React Hook 示例 ====================

// /**
//  * React Hook 使用示例（伪代码）
//  *
//  * import { useEffect, useState } from 'react';
//  * import { ChatClient } from './chat-client';
//  *
//  * function useChat(token: string) {
//  *   const [client, setClient] = useState<ChatClient | null>(null);
//  *   const [messages, setMessages] = useState<Message[]>([]);
//  *   const [isConnected, setIsConnected] = useState(false);
//  *
//  *   useEffect(() => {
//  *     const chatClient = new ChatClient('http://localhost:3001', token);
//  *
//  *     // 重写事件处理方法
//  *     chatClient.onNewMessage = (message) => {
//  *       setMessages(prev => [...prev, message]);
//  *     };
//  *
//  *     chatClient.getSocket().on('connect', () => {
//  *       setIsConnected(true);
//  *     });
//  *
//  *     chatClient.getSocket().on('disconnect', () => {
//  *       setIsConnected(false);
//  *     });
//  *
//  *     setClient(chatClient);
//  *
//  *     return () => {
//  *       chatClient.disconnect();
//  *     };
//  *   }, [token]);
//  *
//  *   return { client, messages, isConnected };
//  * }
//  */

// export { ChatClient, Message, MessagesHistoryResponse };
