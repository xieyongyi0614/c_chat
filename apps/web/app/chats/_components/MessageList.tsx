'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  buildChatMediaPreviewItems,
  MessageList as ChatUiMessageList,
  type ChatMessageFileResolver,
  type ChatMessageListProps,
  type ChatMessageOpenPreviewPayload,
  type ChatMessageRetryPayload,
  type ChatMessageSenderProfile,
} from '@c_chat/ui';
import { audioPlayerManager } from '@c_chat/audio-core';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { useMessageStore } from '@/lib/stores/message.store';
import { useUserStore } from '@/lib/stores/user.store';
import { useAudioPlayerStore } from '@/lib/stores/audioPlayer.store';
import { useLightboxStore } from '@/lib/stores/lightbox.store';
import { messageService, uploadManager } from '@/lib/services';
import { formatFileUrl } from '@/lib/media/formatFileUrl';
import { decodeWaveformForRender } from '@/lib/media/waveform';

interface MessageListProps {
  isGroup: boolean;
  isLoadingLatest: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  onLoadOlder: () => Promise<boolean>;
  onReachBottom: () => void;
}

const SPIKE_COUNT = 40;
const SPIKE_WIDTH = 2;
const SPIKE_GAP = 2;
const HEIGHT = 24;

const fileResolver: ChatMessageFileResolver = {
  formatFileUrl,
};

const messageListLabels = {
  profileTitle: '账号信息',
  ownBadge: '我',
  unknownSender: '未知成员',
  empty: '还没有消息，发送第一条吧',
};

function drawWaveform(
  canvas: HTMLCanvasElement,
  spikes: number[],
  peak: number,
  progress: number,
  color: string,
) {
  const step = SPIKE_WIDTH + SPIKE_GAP;
  const width = spikes.length * step;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = HEIGHT * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${HEIGHT}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.fillStyle = color;

  spikes.forEach((value, index) => {
    ctx.globalAlpha = index / spikes.length < progress ? 1 : 0.4;
    const spikeHeight = Math.max(2, HEIGHT * (value / Math.max(1, peak)));
    const y = (HEIGHT - spikeHeight) / 2;
    ctx.beginPath();
    ctx.roundRect(index * step, y, SPIKE_WIDTH, spikeHeight, 1);
    ctx.fill();
  });
}

const AudioControlsSlot: ChatMessageListProps<LocalMessageListItem>['AudioControlsSlot'] = ({
  message,
  children,
}) => {
  const playKey = message.clientMsgId || message.id;
  const [canvasRef] = useState(() => ({ current: null as HTMLCanvasElement | null }));
  const currentId = useAudioPlayerStore((state) => state.currentId);
  const playing = useAudioPlayerStore((state) => state.playing);
  const progressMap = useAudioPlayerStore((state) => state.progressMap);
  const playerDuration = useAudioPlayerStore((state) => state.duration);
  const isActive = currentId === playKey;
  const currentTime = isActive ? (progressMap[playKey] ?? 0) : 0;
  const totalSeconds = message.duration ?? 0;
  const duration =
    isActive && Number.isFinite(playerDuration) && playerDuration > 0
      ? playerDuration
      : totalSeconds;
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !message.waveform) return;

    const { data, peak } = decodeWaveformForRender(message.waveform, SPIKE_COUNT);
    if (!data.length) return;

    const color = window.getComputedStyle(canvas).color;
    drawWaveform(canvas, data, peak, progress, color);
  }, [canvasRef, message.waveform, progress]);

  // eslint-disable-next-line react-hooks/refs
  return children({
    playback: {
      playing: isActive && playing,
      currentTime,
      duration,
    },
    waveformCanvasRef: canvasRef,
    onTogglePlay: async () => {
      const audioUrl = formatFileUrl(message.fileUrl);
      if (!audioUrl) return;

      if (isActive && playing) {
        audioPlayerManager.pause();
        return;
      }

      await audioPlayerManager.play(playKey, audioUrl);
    },
  });
};

export function MessageList({
  isGroup,
  isLoadingLatest,
  isLoadingOlder,
  hasMoreOlder,
  onLoadOlder,
  onReachBottom,
}: MessageListProps) {
  const dateKeys = useMessageStore((state) => state.dateKeys);
  const groups = useMessageStore((state) => state.groups);
  const msgMap = useMessageStore((state) => state.msgMap);
  const messageCount = useMessageStore((state) => state.messages.length);
  const conversationId = useMessageStore((state) => state.currentConversationId);
  const userInfo = useUserStore((state) => state.userInfo);
  const retryUploadClientMsgIdRef = useRef<string | null>(null);
  const retryFileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = useMemo<ChatMessageSenderProfile | null>(() => {
    if (!userInfo) return null;

    return {
      id: userInfo.id,
      nickname: userInfo.nickname ?? undefined,
      avatarUrl: userInfo.avatarUrl ?? undefined,
      email: userInfo.email ?? undefined,
    };
  }, [userInfo]);

  useEffect(() => {
    if (messageCount > 0) onReachBottom();
  }, [messageCount, onReachBottom]);

  const handleRetryMessages: ChatMessageListProps<LocalMessageListItem>['onRetryMessages'] =
    useCallback(async ({ messages }: ChatMessageRetryPayload<LocalMessageListItem>) => {
      const pendingMediaMessage = messages.find(
        (message) => message.type !== MESSAGE_TYPE.Text && !message.fileId,
      );
      if (pendingMediaMessage) {
        retryUploadClientMsgIdRef.current = pendingMediaMessage.clientMsgId;
        retryFileInputRef.current?.click();
        return;
      }

      for (const message of messages) {
        await messageService.resendMessage(message.clientMsgId);
      }
    }, []);

  const handleRetryFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const clientMsgId = retryUploadClientMsgIdRef.current;
    retryUploadClientMsgIdRef.current = null;

    if (!file || !clientMsgId) return;
    await uploadManager.retry(clientMsgId, file);
  }, []);

  const handleOpenPreview: ChatMessageListProps<LocalMessageListItem>['onOpenPreview'] =
    useCallback(({ message }: ChatMessageOpenPreviewPayload<LocalMessageListItem>) => {
      const previewItems = buildChatMediaPreviewItems(
        useMessageStore.getState().msgMap,
        message.conversationId,
      );
      const fallbackItem = buildChatMediaPreviewItems({ [message.id]: [message] })[0];
      const items = previewItems.length ? previewItems : fallbackItem ? [fallbackItem] : [];
      const initialIndex = Math.max(
        0,
        items.findIndex((item) => item.id === message.id),
      );

      useLightboxStore.getState().openPreview({ items, initialIndex });
    }, []);

  return (
    <>
      <ChatUiMessageList
        conversationKey={conversationId}
        dateKeys={dateKeys}
        groups={groups}
        msgMap={msgMap}
        currentUser={currentUser}
        isGroupConversation={isGroup}
        historyState={{
          isLoadingLatest,
          isLoadingOlder,
          hasMoreOlder,
        }}
        loadOlderMessages={onLoadOlder}
        fileResolver={fileResolver}
        className="px-0 py-2"
        labels={messageListLabels}
        AudioControlsSlot={AudioControlsSlot}
        onRetryMessages={handleRetryMessages}
        onOpenPreview={handleOpenPreview}
      />
      <input
        ref={retryFileInputRef}
        type="file"
        hidden
        onChange={(event) => {
          void handleRetryFileChange(event);
        }}
      />
    </>
  );
}
