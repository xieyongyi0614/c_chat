import { BadRequestException, ConflictException } from '@nestjs/common';
import { CallSessionState } from '@c_chat/shared-types';
import { CallService } from './call.service';

const createPrisma = () => {
  const prisma = {
    conversationParticipant: {
      findMany: jest.fn(),
    },
    callParticipant: {
      findFirst: jest.fn(),
    },
    callSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    callHistory: {
      createMany: jest.fn(),
    },
    rtcEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  );

  return prisma;
};

describe('CallService', () => {
  it('creates a call session with caller and callee participants', async () => {
    const prisma = createPrisma();
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'caller' },
      { userId: 'callee' },
    ]);
    prisma.callParticipant.findFirst.mockResolvedValue(null);
    prisma.callSession.findFirst.mockResolvedValue(null);
    prisma.callSession.create.mockResolvedValue({
      id: 'call-1',
      clientCallId: 'client-call-1',
      conversationId: 'conversation-1',
      initiatorId: 'caller',
      targetUserId: 'callee',
      callType: 'audio',
      state: CallSessionState.ringing_outgoing,
      startAt: new Date('2026-01-01T00:00:00.000Z'),
      acceptedAt: null,
      connectedAt: null,
      endedAt: null,
      duration: null,
      endReason: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const service = new CallService(prisma as never);
    const result = await service.invite('caller', {
      clientCallId: 'client-call-1',
      conversationId: 'conversation-1',
      targetUserId: 'callee',
      callType: 'audio',
      senderDeviceId: 'device-a',
    });

    expect(result.id).toBe('call-1');
    expect(prisma.callSession.create).toHaveBeenCalledWith({
      data: {
        clientCallId: 'client-call-1',
        conversationId: 'conversation-1',
        initiatorId: 'caller',
        targetUserId: 'callee',
        callType: 'audio',
        state: CallSessionState.ringing_outgoing,
        startAt: expect.any(Date),
        participants: {
          create: [
            {
              userId: 'caller',
              deviceId: 'device-a',
              role: 'caller',
              state: CallSessionState.ringing_outgoing,
              joinedAt: expect.any(Date),
            },
            {
              userId: 'callee',
              role: 'callee',
              state: CallSessionState.ringing_incoming,
            },
          ],
        },
      },
    });
  });

  it('rejects invite when either side already has an active call', async () => {
    const prisma = createPrisma();
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'caller' },
      { userId: 'callee' },
    ]);
    prisma.callParticipant.findFirst.mockResolvedValue({ id: 'participant-1' });

    const service = new CallService(prisma as never);

    await expect(
      service.invite('caller', {
        clientCallId: 'client-call-1',
        conversationId: 'conversation-1',
        targetUserId: 'callee',
        callType: 'audio',
        senderDeviceId: 'device-a',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not move a terminal call back to an active state', async () => {
    const prisma = createPrisma();
    prisma.callSession.findUnique.mockResolvedValue({
      id: 'call-1',
      state: CallSessionState.timeout,
    });

    const service = new CallService(prisma as never);

    await expect(
      service.accept('callee', {
        callId: 'call-1',
        clientCallId: 'client-call-1',
        conversationId: 'conversation-1',
        senderId: 'callee',
        targetUserId: 'caller',
        senderDeviceId: 'device-b',
        seq: 1,
        timestamp: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects rtc exchange events after the call is terminal', async () => {
    const prisma = createPrisma();
    prisma.callSession.findUnique.mockResolvedValue({
      id: 'call-1',
      state: CallSessionState.ended,
    });

    const service = new CallService(prisma as never);

    await expect(service.syncRtcEvent('call-1', 'caller', 'ice_candidate')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.rtcEvent.create).not.toHaveBeenCalled();
  });
});
