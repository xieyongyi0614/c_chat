import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  CallSessionState,
  canHandleRtcExchange,
  canTransitionCallSession,
  isActiveCallSessionState,
  type CallRtcServerConfig,
} from '@c_chat/shared-types';
import { PrismaService } from '../../core/database';
import { createHmac } from 'node:crypto';

interface InviteCallInput {
  clientCallId: string;
  conversationId: string;
  targetUserId: string;
  callType: string;
  senderDeviceId: string;
}

interface CallSignalMetaInput {
  callId: string;
  clientCallId: string;
  conversationId: string;
  senderId: string;
  targetUserId: string;
  senderDeviceId: string;
  targetDeviceId?: string | null;
  seq: number;
  timestamp: number;
}

export type CallSessionRecord = Awaited<ReturnType<CallService['findCallSessionOrThrow']>>;

@Injectable()
export class CallService {
  constructor(private prisma: PrismaService) {}

  async getRtcConfig(userId: string, callId?: string): Promise<CallRtcServerConfig> {
    if (callId) {
      const call = await this.findCallSessionOrThrow(callId);
      this.assertCallParticipant(call, userId);
    }

    const stunUrls = this.parseIceUrls(
      process.env.CALL_STUN_URLS ?? process.env.STUN_URLS ?? 'stun:stun.l.google.com:19302',
    );
    const turnUrls = this.parseIceUrls(process.env.CALL_TURN_URLS ?? process.env.TURN_URLS ?? '');
    const turnSecret = process.env.CALL_TURN_SHARED_SECRET ?? process.env.TURN_SHARED_SECRET ?? '';
    const ttlSeconds = Number(process.env.CALL_TURN_CREDENTIAL_TTL_SECONDS ?? 600);
    const expiresAt = Date.now() + ttlSeconds * 1000;

    const iceServers: CallRtcServerConfig['iceServers'] = [];

    if (stunUrls.length > 0) {
      iceServers.push({ urls: stunUrls.length === 1 ? stunUrls[0] : stunUrls });
    }

    if (turnUrls.length > 0) {
      const username = `${Math.floor(expiresAt / 1000)}:${userId}${callId ? `:${callId}` : ''}`;
      const credential = turnSecret ? this.buildTurnCredential(turnSecret, username) : undefined;

      turnUrls.forEach((url) => {
        iceServers.push({
          urls: url,
          ...(credential ? { username, credential } : {}),
        });
      });
    }

    return {
      iceServers,
      callId,
      expiresAt,
    };
  }

  async invite(initiatorId: string, input: InviteCallInput) {
    await this.assertConversationParticipants(input.conversationId, [
      initiatorId,
      input.targetUserId,
    ]);
    await this.assertUsersAvailable([initiatorId, input.targetUserId]);

    const existing = await this.prisma.callSession.findFirst({
      where: {
        initiatorId,
        clientCallId: input.clientCallId,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.$transaction((tx) =>
      tx.callSession.create({
        data: {
          clientCallId: input.clientCallId,
          conversationId: input.conversationId,
          initiatorId,
          targetUserId: input.targetUserId,
          callType: input.callType,
          state: CallSessionState.ringing_outgoing,
          startAt: new Date(),
          participants: {
            create: [
              {
                userId: initiatorId,
                deviceId: input.senderDeviceId,
                role: 'caller',
                state: CallSessionState.ringing_outgoing,
                joinedAt: new Date(),
              },
              {
                userId: input.targetUserId,
                role: 'callee',
                state: CallSessionState.ringing_incoming,
              },
            ],
          },
        },
      }),
    );
  }

  async accept(userId: string, meta: CallSignalMetaInput) {
    const call = await this.findCallSessionOrThrow(meta.callId);
    this.assertCanTransition(call.state, CallSessionState.accepted);

    if (call.targetUserId !== userId && call.initiatorId !== userId) {
      throw new BadRequestException('无权接听该通话');
    }

    return this.prisma.$transaction(async (tx) => {
      const acceptedAt = new Date();
      const updated = await tx.callSession.update({
        where: { id: meta.callId },
        data: {
          state: CallSessionState.accepted,
          acceptedAt,
          participants: {
            updateMany: {
              where: { userId },
              data: {
                state: CallSessionState.accepted,
                deviceId: meta.senderDeviceId,
                joinedAt: acceptedAt,
              },
            },
          },
        },
      });

      await tx.callParticipant.updateMany({
        where: { callId: meta.callId, userId: { not: userId } },
        data: { state: CallSessionState.accepted },
      });

      return updated;
    });
  }

  async end(userId: string, meta: CallSignalMetaInput, state: CallSessionState, reason: string) {
    const call = await this.findCallSessionOrThrow(meta.callId);
    this.assertCanTransition(call.state, state);

    if (call.initiatorId !== userId && call.targetUserId !== userId) {
      throw new BadRequestException('无权结束该通话');
    }

    return this.finishCall(call, state, reason);
  }

  async timeout(callId: string) {
    const call = await this.findCallSessionOrThrow(callId);
    if (!canTransitionCallSession(call.state as CallSessionState, CallSessionState.timeout)) {
      return call;
    }
    return this.finishCall(call, CallSessionState.timeout, 'timeout');
  }

  async syncRtcEvent(callId: string, userId: string, eventType: string, payload?: object) {
    const call = await this.findCallSessionOrThrow(callId);
    this.assertCanHandleRtcExchange(call.state);
    this.assertCallParticipant(call, userId);

    return this.prisma.rtcEvent.create({
      data: {
        callId,
        userId,
        eventType,
        payload,
      },
    });
  }

  assertCanHandleRtcExchange(state: string) {
    if (!canHandleRtcExchange(state as CallSessionState)) {
      throw new BadRequestException('通话状态已结束');
    }
  }

  private async findCallSessionOrThrow(callId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new BadRequestException('通话不存在');
    }

    return call;
  }

  private parseIceUrls(rawValue: string) {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildTurnCredential(secret: string, username: string) {
    return createHmac('sha1', secret).update(username).digest('base64');
  }

  private assertCallParticipant(
    call: Awaited<ReturnType<CallService['findCallSessionOrThrow']>>,
    userId: string,
  ) {
    if (call.initiatorId !== userId && call.targetUserId !== userId) {
      throw new BadRequestException('无权访问该通话');
    }
  }

  private async assertConversationParticipants(conversationId: string, userIds: string[]) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { in: userIds },
        isDeleted: false,
      },
      select: { userId: true },
    });

    if (participants.length !== userIds.length) {
      throw new BadRequestException('无权发起该会话通话');
    }
  }

  private async assertUsersAvailable(userIds: string[]) {
    const activeParticipant = await this.prisma.callParticipant.findFirst({
      where: {
        userId: { in: userIds },
        state: { in: this.getActiveStateList() },
      },
    });

    if (activeParticipant) {
      throw new ConflictException('用户忙线中');
    }
  }

  private getActiveStateList() {
    return Object.values(CallSessionState).filter(isActiveCallSessionState);
  }

  private assertCanTransition(from: string, to: CallSessionState) {
    if (!canTransitionCallSession(from as CallSessionState, to)) {
      throw new BadRequestException('通话状态已结束');
    }
  }

  private async finishCall(
    call: Awaited<ReturnType<CallService['findCallSessionOrThrow']>>,
    state: CallSessionState,
    reason: string,
  ) {
    const endedAt = new Date();
    const duration = call.acceptedAt
      ? Math.max(0, Math.floor((endedAt.getTime() - call.acceptedAt.getTime()) / 1000))
      : 0;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.callSession.update({
        where: { id: call.id },
        data: {
          state,
          endedAt,
          duration,
          endReason: reason,
        },
      });

      await tx.callParticipant.updateMany({
        where: { callId: call.id },
        data: {
          state,
          leftAt: endedAt,
        },
      });

      await tx.callHistory.createMany({
        data: [
          {
            callId: call.id,
            conversationId: call.conversationId,
            userId: call.initiatorId,
            peerUserId: call.targetUserId,
            direction: 'outgoing',
            callType: call.callType,
            result: state,
            duration,
            startedAt: call.startAt,
            endedAt,
          },
          {
            callId: call.id,
            conversationId: call.conversationId,
            userId: call.targetUserId,
            peerUserId: call.initiatorId,
            direction: 'incoming',
            callType: call.callType,
            result: state,
            duration,
            startedAt: call.startAt,
            endedAt,
          },
        ],
      });

      return updated;
    });
  }
}
