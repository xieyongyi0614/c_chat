jest.mock('./message.handler', () => ({
  MessageHandler: class {
    sendMessageToClient = jest.fn();
    sendErrorMessageToClient = jest.fn();
  },
}));
jest.mock('../services/chat.service', () => ({ ChatService: class {} }));
jest.mock('../services/message.service', () => ({ MessageService: class {} }));
jest.mock(
  'src/auth',
  () => ({
    AuthService: class {},
    WsJwtAuthGuard: class {},
  }),
  { virtual: true },
);
jest.mock('src/core/database', () => ({ PrismaService: class {} }), { virtual: true });
jest.mock('src/api/web/users/users.service', () => ({ UsersService: class {} }), { virtual: true });

import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  it('joins the stable user room and all conversation rooms when a socket connects', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    const client = {
      id: 'socket-1',
      data: {},
      join,
      emit: jest.fn(),
    };
    const authService = {
      authenticateSocket: jest.fn().mockResolvedValue({ id: 'user-1' }),
      validateUser: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'User',
        updateTime: new Date(0),
      }),
    };
    const chatService = {
      getUserConversationIds: jest.fn().mockResolvedValue(['conversation-1', 'conversation-2']),
    };
    const gateway = new ChatGateway(
      {} as never,
      chatService as never,
      authService as never,
      {} as never,
      {} as never,
    );

    await gateway.handleConnection(client as never);

    expect(join).toHaveBeenCalledWith('user:user-1');
    expect(join).toHaveBeenCalledWith('conversation-1');
    expect(join).toHaveBeenCalledWith('conversation-2');
    expect(join).toHaveBeenCalledTimes(3);
  });
});
