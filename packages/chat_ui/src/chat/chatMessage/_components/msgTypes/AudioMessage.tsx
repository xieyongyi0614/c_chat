import { memo } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import MessageDate from './MessageDate';
import type { AudioMessageProps } from './types';

function formatTime(sec: number) {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function AudioMessage({
  audioUrl,
  voice,
  isMe,
  isRead,
  senderName,
  forwarded,
  message,
  onRetry,
  retrying,
  playback,
  waveformCanvasRef,
  fileResolver,
  onTogglePlay,
}: AudioMessageProps) {
  const totalDuration = voice.duration || playback.duration || 0;

  return (
    <div className="group relative">
      <audio src={fileResolver.formatFileUrl(audioUrl)} preload="metadata" />

      {forwarded && senderName && (
        <div className="mb-2 text-[13px] font-medium text-primary">Forwarded from {senderName}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void onTogglePlay();
          }}
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full transition-all',
            isMe ? 'bg-[var(--message-green)]' : 'bg-primary',
            playback.playing && 'scale-95',
          )}
        >
          {playback.playing ? (
            <Pause className="ml-px size-5 fill-primary-foreground text-primary-foreground" />
          ) : (
            <Play className="ml-0.5 size-5 fill-primary-foreground text-primary-foreground" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-8 items-center gap-0.5" draggable={false}>
            <canvas ref={waveformCanvasRef} />
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-foreground/55">
            <div className="flex items-center gap-1">
              <span>{formatTime(playback.currentTime)}</span>
              <span>/</span>
              <span>{formatTime(totalDuration)}</span>
              {playback.playing && (
                <div className="ml-1 size-1.5 rounded-full bg-[var(--message-green)]" />
              )}
            </div>

            <MessageDate
              time={message.createTime}
              status={message.status}
              isMe={isMe}
              isRead={isRead}
              onRetry={onRetry}
              retrying={retrying}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AudioMessage);
