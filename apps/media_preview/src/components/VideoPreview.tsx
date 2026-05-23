import type { MediaPreviewItem } from '@c_chat/shared-types';
import { Button, cn } from '@c_chat/ui';
import { Pause, Play, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { resolveMediaUrl, revokeObjectUrl } from '../utils/media';
import {
  VIDEO_RATES,
  clamp,
  formatDuration,
  getMediaErrorMessage,
  seekMedia,
} from '../utils/preview';

interface VideoPreviewProps {
  item: MediaPreviewItem;
}

export function VideoPreview({ item }: VideoPreviewProps) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<(typeof VIDEO_RATES)[number]>(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    setLoading(true);
    setError('');
    setSrc('');
    setPlaying(false);
    setDuration(0);
    setCurrentTime(0);

    resolveMediaUrl(item)
      .then((url) => {
        if (!active) {
          revokeObjectUrl(url);
          return;
        }

        objectUrl = url;
        setSrc(url);
        setLoading(false);
        if (!url) setError(getMediaErrorMessage('video', 'empty-source'));
      })
      .catch((err) => {
        console.error('Failed to load video:', err);
        if (active) {
          setError(getMediaErrorMessage('video', 'load-failed'));
          setLoading(false);
        }
      });

    return () => {
      active = false;
      videoRef.current?.pause();
      revokeObjectUrl(objectUrl);
    };
  }, [item, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    video.playbackRate = playbackRate;
  }, [volume, muted, playbackRate, src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seekMedia(video.currentTime, video.duration, delta);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-5);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(5);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!playing || !controlsVisible) return;

    const timer = window.setTimeout(() => setControlsVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [controlsVisible, playing]);

  const showControls = () => setControlsVisible(true);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/55">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-black/60">
        <div>{error}</div>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center px-8 py-8"
      onMouseMove={showControls}
    >
      <video
        ref={videoRef}
        src={src}
        className="min-h-0 max-h-full max-w-full bg-black shadow-xl"
        autoPlay
        playsInline
        onClick={togglePlay}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
        onError={() => setError(getMediaErrorMessage('video', 'unsupported-format'))}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onPause={() => setPlaying(false)}
        onPlay={() => {
          setPlaying(true);
          showControls();
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <div
        className={cn(
          'absolute bottom-5 left-1/2 flex w-[calc(100%-4rem)] max-w-4xl -translate-x-1/2 flex-col gap-3 rounded-md bg-white/92 px-4 py-3 text-black/70 shadow-lg backdrop-blur transition-opacity',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onFocus={showControls}
        onMouseEnter={showControls}
      >
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
          <button className="media-toolbar-button" type="button" onClick={togglePlay}>
            {playing ? <Pause className="size-[20px]" /> : <Play className="size-[20px]" />}
          </button>
          <div className="w-28 text-xs tabular-nums text-black/55">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </div>
          <button
            className={cn('media-toolbar-button', muted && 'is-active')}
            type="button"
            onClick={() => setMuted((value) => !value)}
          >
            {muted || volume === 0 ? (
              <VolumeX className="size-[20px]" />
            ) : volume > 0.5 ? (
              <Volume2 className="size-[20px]" />
            ) : (
              <Volume1 className="size-[20px]" />
            )}
          </button>
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
          <button
            className="media-toolbar-button"
            type="button"
            title="回到开头"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
              setCurrentTime(0);
            }}
          >
            <RotateCcw className="size-[18px]" />
          </button>
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
}
