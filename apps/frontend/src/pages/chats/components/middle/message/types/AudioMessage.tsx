import useWaveformCanvas from '@c_chat/frontend/hooks/useWaveformCanvas';
import type { LocalMessageListItem, VoiceMetadata } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';
import { Pause, Play } from 'lucide-react';
import { memo, useRef } from 'react';
import MessageDate from '../MessageDate';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import { audioPlayerManager } from '@c_chat/audio-core';
import { useAudioMessage } from '@c_chat/frontend/hooks/useAudioMessage';

interface AudioMessageProps {
  audioUrl: string;
  voice: Pick<VoiceMetadata, 'waveform' | 'duration'>;

  isMe: boolean;

  senderName?: string;

  forwarded?: boolean;
  msg: LocalMessageListItem;
}

function AudioMessage({ audioUrl, voice, isMe, senderName, forwarded, msg }: AudioMessageProps) {
  const { playing, currentTime, duration } = useAudioMessage(msg.clientMsgId);
  const waveformCanvasRef = useWaveformCanvas(voice, currentTime / duration, isMe);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  console.log('msg', msg.clientMsgId, audioUrl, playing, currentTime, duration);

  const totalDuration = voice.duration ?? 196;

  const togglePlay = async () => {
    const audio = audioRef.current;
    console.log(audioRef.current, 'audioRef.current');
    if (!audio) return;
    if (playing) {
      // audio.pause();
      audioPlayerManager.pause();
      // setPlaying(false);
    } else {
      // await audio.play();
      await audioPlayerManager.play(msg.clientMsgId, audio.src);
      // setPlaying(true);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);

    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={cn('group relative')}>
      <audio ref={audioRef} src={formatFileUrl(audioUrl)} preload="metadata" />

      {forwarded && senderName && (
        <div className="mb-2 text-[13px] font-medium text-[#53BDEB]">
          Forwarded from {senderName}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* play button */}
        <button
          onClick={togglePlay}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all',
            isMe ? 'bg-[var(--message-green)]' : 'bg-[#53BDEB]',
            playing && 'scale-95',
          )}
        >
          {playing ? (
            <Pause className="ml-[1px] h-5 w-5 fill-white text-white" />
          ) : (
            <Play className="ml-[2px] h-5 w-5 fill-white text-white" />
          )}
        </button>

        {/* waveform */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-8 items-center gap-[2px]" draggable={false}>
            <canvas ref={waveformCanvasRef} />
          </div>

          {/* bottom info */}
          <div className="mt-1 flex items-center justify-between text-[11px] text-black/55">
            <div className="flex items-center gap-1">
              <span>{formatTime(currentTime)}</span>

              <span>/</span>

              <span>{formatTime(totalDuration)}</span>

              {playing && (
                <div className="ml-1 h-1.5 w-1.5 rounded-full bg-[var(--message-green)]" />
              )}
            </div>

            <MessageDate time={msg.createTime} status={msg.status} isMe={isMe} isRead={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AudioMessage);
