'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { audioPlayerManager, formatDuration } from '@c_chat/audio-core';
import { Button, cn } from '@c_chat/ui';
import type { LocalMessageListItem } from '@c_chat/shared-types';
import { useAudioPlayerStore } from '@/lib/stores/audioPlayer.store';
import { formatFileUrl } from '@/lib/media/formatFileUrl';
import { decodeWaveformForRender } from '@/lib/media/waveform';

interface VoiceMessageProps {
  message: LocalMessageListItem;
  isMe: boolean;
}

const SPIKE_COUNT = 40;
const SPIKE_WIDTH = 2;
const SPIKE_GAP = 2;
const HEIGHT = 24;

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

export function VoiceMessage({ message, isMe }: VoiceMessageProps) {
  const playKey = message.clientMsgId || message.id;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentId = useAudioPlayerStore((state) => state.currentId);
  const playing = useAudioPlayerStore((state) => state.playing);
  const progressMap = useAudioPlayerStore((state) => state.progressMap);
  const playerDuration = useAudioPlayerStore((state) => state.duration);

  const [playError, setPlayError] = useState(false);

  const isActive = currentId === playKey;
  const isPlaying = isActive && playing;
  const totalSeconds = message.duration ?? 0;
  const currentSeconds = isActive ? (progressMap[playKey] ?? 0) : 0;
  const hasFinitePlayerDuration = Number.isFinite(playerDuration) && playerDuration > 0;
  const totalForProgress = isActive && hasFinitePlayerDuration ? playerDuration : totalSeconds;
  const progress = totalForProgress > 0 ? currentSeconds / totalForProgress : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !message.waveform) return;
    const { data, peak } = decodeWaveformForRender(message.waveform, SPIKE_COUNT);
    if (data.length === 0) return;
    const color = window.getComputedStyle(canvas).color;
    drawWaveform(canvas, data, peak, progress, color);
  }, [message.waveform, progress]);

  const togglePlay = () => {
    if (isPlaying) {
      audioPlayerManager.pause();
      return;
    }
    setPlayError(false);
    audioPlayerManager.play(playKey, formatFileUrl(message.fileUrl)).catch(() => {
      setPlayError(true);
    });
  };

  const seek = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive || totalForProgress <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audioPlayerManager.seek(ratio * totalForProgress);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={isPlaying ? '暂停' : '播放'}
        className={cn('size-8 shrink-0', isMe ? 'hover:bg-primary-foreground/15' : 'hover:bg-foreground/10')}
        onClick={togglePlay}
      >
        {isPlaying ? <Pause /> : <Play />}
      </Button>
      <canvas
        ref={canvasRef}
        onClick={seek}
        className={cn('cursor-pointer', isMe ? 'text-primary-foreground' : 'text-foreground')}
      />
      {playError ? (
        <span className="text-xs text-destructive">播放失败</span>
      ) : (
        <span className="min-w-9 text-xs tabular-nums">
          {formatDuration((isActive ? currentSeconds : totalSeconds) * 1000)}
        </span>
      )}
    </div>
  );
}
