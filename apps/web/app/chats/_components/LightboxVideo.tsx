'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, cn } from '@c_chat/ui';
import { Pause, Play, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { MediaPreviewItem } from '@c_chat/shared-types';
import { formatFileUrl } from '@/lib/media/formatFileUrl';

export interface LightboxVideoHandle {
  togglePlay: () => void;
  seekBy: (delta: number) => void;
}

interface LightboxVideoProps {
  item: MediaPreviewItem;
  onBackdropClick: () => void;
}

const VIDEO_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const formatDuration = (seconds: number): string => {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

export const LightboxVideo = forwardRef<LightboxVideoHandle, LightboxVideoProps>(
  function LightboxVideo({ item, onBackdropClick }, ref) {
    const src = formatFileUrl(item.fileUrl);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState<(typeof VIDEO_RATES)[number]>(1);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const retry = () => {
      setError(false);
      setPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setReloadKey((value) => value + 1);
    };

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = volume;
      video.muted = muted;
      video.playbackRate = playbackRate;
    }, [volume, muted, playbackRate, src]);

    useEffect(() => {
      const video = videoRef.current;
      return () => {
        video?.pause();
      };
    }, []);

    const togglePlay = () => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) void video.play();
      else video.pause();
    };

    const seekBy = (delta: number) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      video.currentTime = clamp(video.currentTime + delta, 0, video.duration);
    };

    useImperativeHandle(ref, () => ({ togglePlay, seekBy }));

    if (!src) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-white/60">
          视频地址为空
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-white/70">
          <div>视频无法播放，可能是不支持的格式</div>
          <Button variant="outline" size="sm" onClick={retry}>
            重试
          </Button>
        </div>
      );
    }

    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onBackdropClick();
        }}
      >
        <video
          key={reloadKey}
          ref={videoRef}
          src={src}
          className="min-h-0 max-h-[calc(100vh-160px)] max-w-[calc(100vw-160px)] bg-black shadow-xl"
          autoPlay
          playsInline
          onClick={togglePlay}
          onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(true)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        />
        <div className="absolute bottom-6 left-1/2 flex w-[calc(100%-8rem)] max-w-4xl -translate-x-1/2 flex-col gap-3 rounded-md bg-white/90 px-4 py-3 text-black/70 shadow-lg backdrop-blur">
          <input
            aria-label="播放进度"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={clamp(currentTime, 0, duration || 0)}
            onChange={(event) => {
              const nextTime = Number(event.currentTarget.value);
              if (videoRef.current) videoRef.current.currentTime = nextTime;
              setCurrentTime(nextTime);
            }}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={playing ? '暂停' : '播放'}
              onClick={togglePlay}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <div className="w-28 text-xs tabular-nums text-black/55">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={muted ? '取消静音' : '静音'}
              className={cn(muted && 'text-primary')}
              onClick={() => setMuted((value) => !value)}
            >
              {muted || volume === 0 ? <VolumeX /> : volume > 0.5 ? <Volume2 /> : <Volume1 />}
            </Button>
            <input
              aria-label="音量"
              className="w-24"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.currentTarget.value))}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="回到开头"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setCurrentTime(0);
              }}
            >
              <RotateCcw />
            </Button>
            <select
              aria-label="播放速度"
              className="h-8 rounded border border-black/12 bg-white px-2 text-sm"
              value={playbackRate}
              onChange={(event) =>
                setPlaybackRate(Number(event.currentTarget.value) as (typeof VIDEO_RATES)[number])
              }
            >
              {VIDEO_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
            <div className="min-w-0 flex-1 truncate text-right text-xs text-black/45">
              {item.fileName || '视频'}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
