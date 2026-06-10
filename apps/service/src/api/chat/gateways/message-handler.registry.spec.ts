import { ServiceToClientEvent } from '@c_chat/shared-protobuf/protoMap';
import { MessageHandlerRegistry } from './message-handler.registry';

class TestRegistry extends MessageHandlerRegistry {
  public server = {
    to: jest.fn(),
  } as never;

  protected userSockets = new Map<string, Set<string>>();

  protected initializeHandlers(): void {}

  sendToUser(userId: string, payload: Uint8Array) {
    this.sendMessageToUser(userId, ServiceToClientEvent.newUpdateMessage, payload, 'sender-1');
  }
}

describe('MessageHandlerRegistry', () => {
  it('sends user-scoped events through the stable user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const registry = new TestRegistry();
    registry.server = { to } as never;

    registry.sendToUser('user-1', new Uint8Array([1, 2, 3]));

    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(emit).toHaveBeenCalledWith('message', expect.any(Uint8Array));
  });
});
