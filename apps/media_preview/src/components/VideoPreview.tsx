import type { MediaPreviewItem } from '@c_chat/shared-types';
import { useEffect, useRef, useState } from 'react';
import { resolveMediaUrl, revokeObjectUrl } from '../utils/media';

interface VideoPreviewProps {
  item: MediaPreviewItem;
}

export function VideoPreview({ item }: VideoPreviewProps) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setLoading(true);
    setError('');

    resolveMediaUrl(item)
      .then((url) => {
        if (!active) {
          revokeObjectUrl(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
        setLoading(false);
        if (!url) setError('视频地址为空');
      })
      .catch((err) => {
        console.error('Failed to load video:', err);
        if (active) {
          setError('视频加载失败');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      videoRef.current?.pause();
      revokeObjectUrl(objectUrl);
    };
  }, [item]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (video.paused) void video.play();
        else video.pause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/55">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/60">{error}</div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-8 py-8">
      <video
        ref={videoRef}
        src={src}
        className="max-h-full max-w-full bg-black shadow-xl"
        controls
        autoPlay
        playsInline
        onError={() => setError('视频无法播放')}
      />
    </div>
  );
}
