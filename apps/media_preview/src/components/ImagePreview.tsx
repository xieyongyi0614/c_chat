import type { MediaPreviewItem } from '@c_chat/shared-types';
import { useEffect, useRef, useState } from 'react';
import { resolveMediaUrl, revokeObjectUrl } from '../utils/media';

interface ImagePreviewProps {
  item: MediaPreviewItem;
  resetKey: string;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
type ImageAction = 'zoom-in' | 'zoom-out' | 'rotate' | 'reset';

export function ImagePreview({ item, resetKey }: ImagePreviewProps) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    setLoading(true);
    setError('');
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setDragging(false);

    resolveMediaUrl(item)
      .then((url) => {
        if (!active) {
          revokeObjectUrl(url);
          return;
        }

        objectUrl = url;
        setSrc(url);
        setLoading(false);

        if (!url) setError('图片地址为空');
      })
      .catch((err) => {
        console.error('Failed to load image:', err);
        if (active) {
          setError('图片加载失败');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      revokeObjectUrl(objectUrl);
    };
  }, [item, resetKey]);

  const zoom = (delta: number) => {
    setScale((value) => clamp(Number((value + delta).toFixed(2)), 0.2, 5));
  };

  const reset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  };

  useEffect(() => {
    const onImageAction = (event: Event) => {
      const action = (event as CustomEvent<ImageAction>).detail;
      if (action === 'zoom-in') zoom(0.2);
      if (action === 'zoom-out') zoom(-0.2);
      if (action === 'rotate') setRotation((value) => value + 90);
      if (action === 'reset') reset();
    };

    window.addEventListener('media-preview:image-action', onImageAction);
    return () => window.removeEventListener('media-preview:image-action', onImageAction);
  }, []);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 py-6"
      onWheel={(event) => {
        event.preventDefault();
        zoom(event.deltaY > 0 ? -0.1 : 0.1);
      }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-black/55">
          加载中...
        </div>
      )}

      {!loading && error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-black/60">
          {error}
        </div>
      )}

      {src && !error && (
        <img
          src={src}
          alt={item.fileName || '图片'}
          draggable={false}
          className="max-h-[calc(100vh-120px)] max-w-[calc(100vw-80px)] select-none object-contain"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
          }}
          onDoubleClick={reset}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              x: event.clientX,
              y: event.clientY,
              startX: offset.x,
              startY: offset.y,
            };
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            setOffset({
              x: dragRef.current.startX + event.clientX - dragRef.current.x,
              y: dragRef.current.startY + event.clientY - dragRef.current.y,
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            setDragging(false);
          }}
        />
      )}
    </div>
  );
}
