'use client';

import { useEffect, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@c_chat/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLightboxStore } from '@/lib/stores/lightbox.store';
import { LightboxImage, type LightboxImageHandle } from './LightboxImage';
import { LightboxVideo, type LightboxVideoHandle } from './LightboxVideo';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

export function MediaLightbox() {
  const open = useLightboxStore((state) => state.open);
  const items = useLightboxStore((state) => state.items);
  const index = useLightboxStore((state) => state.index);
  const close = useLightboxStore((state) => state.close);
  const next = useLightboxStore((state) => state.next);
  const prev = useLightboxStore((state) => state.prev);

  const imageRef = useRef<LightboxImageHandle>(null);
  const videoRef = useRef<LightboxVideoHandle>(null);

  const current = items[index];

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const active = useLightboxStore.getState().items[useLightboxStore.getState().index];
      if (!active) return;

      if (active.type === 'image') {
        if (event.key === 'ArrowLeft') prev();
        else if (event.key === 'ArrowRight') next();
        else if (event.key === '+' || event.key === '=') imageRef.current?.zoomIn();
        else if (event.key === '-') imageRef.current?.zoomOut();
        else if (event.key === '0') imageRef.current?.reset();
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        videoRef.current?.togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        videoRef.current?.seekBy(-5);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        videoRef.current?.seekBy(5);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, next, prev]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent
        showCloseButton
        className="h-screen w-screen max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 rounded-none border-0 bg-black/95 p-0 text-white sm:max-w-none [&_[data-slot=dialog-close]]:text-white"
      >
        <DialogTitle className="sr-only">媒体预览</DialogTitle>

        {current ? (
          <div className="relative flex h-full w-full items-center justify-center">
            {current.type === 'image' ? (
              <LightboxImage key={current.id} ref={imageRef} item={current} />
            ) : (
              <LightboxVideo key={current.id} ref={videoRef} item={current} />
            )}

            {items.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="上一张"
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                  onClick={prev}
                  disabled={index <= 0}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="下一张"
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                  onClick={next}
                  disabled={index >= items.length - 1}
                >
                  <ChevronRight />
                </Button>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-sm text-white/70 tabular-nums">
                  {index + 1} / {items.length}
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
