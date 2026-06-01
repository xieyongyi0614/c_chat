'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@c_chat/ui';
import type { MediaPreviewItem } from '@c_chat/shared-types';

export interface LightboxImageHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface LightboxImageProps {
  item: MediaPreviewItem;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const LightboxImage = forwardRef<LightboxImageHandle, LightboxImageProps>(
  function LightboxImage({ item }, ref) {
    const src = item.fileUrl ?? '';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

    const retry = () => {
      setError(false);
      setLoading(true);
      setReloadKey((value) => value + 1);
    };

    const zoom = (delta: number) => {
      setScale((value) => clamp(Number((value + delta).toFixed(2)), 0.2, 5));
    };

    const reset = () => {
      setScale(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setDragging(false);
    };

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoom(0.2),
      zoomOut: () => zoom(-0.2),
      reset,
    }));

    if (!src) {
      return <div className="flex h-full items-center justify-center text-sm text-white/60">图片地址为空</div>;
    }

    return (
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY > 0 ? -0.1 : 0.1);
        }}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
            加载中...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/70">
            <div>图片加载失败</div>
            <Button variant="outline" size="sm" onClick={retry}>
              重试
            </Button>
          </div>
        )}

        {!error && (
          <img
            key={reloadKey}
            src={src}
            alt={item.fileName || '图片'}
            draggable={false}
            className="max-h-[calc(100vh-120px)] max-w-[calc(100vw-160px)] select-none object-contain"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
              visibility: loading ? 'hidden' : 'visible',
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError(true);
              setLoading(false);
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
  },
);
