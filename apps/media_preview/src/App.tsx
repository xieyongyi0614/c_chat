import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import type { MediaPreviewPayload } from '@c_chat/shared-types';
import { ipc } from '@c_chat/shared-utils';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Expand,
  Grid3X3,
  Maximize,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pin,
  RotateCw,
  ScanText,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ImagePreview } from './components/ImagePreview';
import { VideoPreview } from './components/VideoPreview';

const normalizeIndex = (payload: MediaPreviewPayload | null) => {
  if (!payload?.items.length) return 0;
  return Math.max(0, Math.min(payload.initialIndex ?? 0, payload.items.length - 1));
};

const dispatchImageAction = (action: 'zoom-in' | 'zoom-out' | 'rotate' | 'reset') => {
  window.dispatchEvent(new CustomEvent('media-preview:image-action', { detail: action }));
};

function App() {
  const [payload, setPayload] = useState<MediaPreviewPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    ipc.GetMediaPreviewPayload(undefined).then((data) => {
      if (!mounted || !data) return;
      setPayload(data);
      setCurrentIndex(normalizeIndex(data));
    });

    const unsubscribe = window.c_chat.on(
      ELECTRON_TO_CLIENT_CHANNELS.MediaPreviewPayloadUpdated,
      (data) => {
        setPayload(data);
        setCurrentIndex(normalizeIndex(data));
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const items = payload?.items ?? [];
  const item = items[currentIndex];
  const hasMultiple = items.length > 1;

  const title = useMemo(() => {
    if (!item) return 'Media Preview';
    return item.fileName || (item.type === 'video' ? 'Video' : 'Image');
  }, [item]);

  const go = (delta: number) => {
    if (!items.length) return;
    setCurrentIndex((value) => Math.max(0, Math.min(value + delta, items.length - 1)));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.close();
        return;
      }

      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);

      if (item?.type === 'image' && event.key === '+' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items.length, item?.type]);

  return (
    <div className="flex h-full w-full flex-col bg-[#f5f5f5] text-[#202124]">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-black/8 bg-[#e7e7e9] px-4 shadow-sm [-webkit-app-region:drag]">
        <div className="flex min-w-0 items-center gap-2 [-webkit-app-region:no-drag]">
          <button className="media-toolbar-button" title="Pin" type="button">
            <Pin className="size-[22px]" />
          </button>
          <div className="mx-1 h-7 w-px bg-black/12" />
          <button
            className="media-toolbar-button"
            onClick={() => go(-1)}
            disabled={currentIndex <= 0}
            title="Previous"
            type="button"
          >
            <ArrowLeft className="size-[22px]" />
          </button>
          <button
            className="media-toolbar-button"
            onClick={() => go(1)}
            disabled={currentIndex >= items.length - 1}
            title="Next"
            type="button"
          >
            <ArrowRight className="size-[22px]" />
          </button>
          <button className="media-toolbar-button" title="Thumbnails" type="button">
            <Grid3X3 className="size-[22px]" />
          </button>
          <div className="mx-1 h-7 w-px bg-black/12" />
          <button
            className="media-toolbar-button"
            disabled={item?.type !== 'image'}
            onClick={() => dispatchImageAction('zoom-in')}
            title="Zoom in"
            type="button"
          >
            <ZoomIn className="size-[22px]" />
          </button>
          <button
            className="media-toolbar-button"
            disabled={item?.type !== 'image'}
            onClick={() => dispatchImageAction('zoom-out')}
            title="Zoom out"
            type="button"
          >
            <ZoomOut className="size-[22px]" />
          </button>
          <button
            className="media-toolbar-button"
            disabled={item?.type !== 'image'}
            onClick={() => dispatchImageAction('reset')}
            title="Actual size"
            type="button"
          >
            <Maximize className="size-[22px]" />
          </button>
          <div className="mx-1 h-7 w-px bg-black/12" />
          <button className="media-toolbar-button" title="Crop" type="button">
            <ScanText className="size-[22px]" />
          </button>
          <button className="media-toolbar-button" title="Edit" type="button">
            <MousePointer2 className="size-[22px]" />
          </button>
          <button
            className="media-toolbar-button"
            disabled={item?.type !== 'image'}
            onClick={() => dispatchImageAction('rotate')}
            title="Rotate"
            type="button"
          >
            <RotateCw className="size-[22px]" />
          </button>
          <button className="media-toolbar-button" title="Download" type="button">
            <ArrowDownToLine className="size-[22px]" />
          </button>
        </div>

        <div className="min-w-0 flex-1 px-6 text-center [-webkit-app-region:drag]">
          <span className="inline-block max-w-[38vw] truncate align-middle text-sm text-black/55">
            {title}
          </span>
          {items.length > 0 && (
            <span className="ml-2 align-middle text-xs text-black/40">
              {currentIndex + 1} / {items.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
          <button className="media-toolbar-button" title="More" type="button">
            <MoreHorizontal className="size-[22px]" />
          </button>
          <div className="mx-1 h-7 w-px bg-black/12" />
          <button
            className="media-toolbar-button"
            onClick={() => window.c_chat.focusWindowById(payload?.sourceWindowId ?? 0)}
            title="Back"
            type="button"
          >
            <Expand className="size-[21px]" />
          </button>
          <button
            className="media-window-button"
            onClick={() => window.c_chat.minimizeCurrentWindow()}
            title="Minimize"
            type="button"
          >
            <Minus className="size-[18px]" />
          </button>
          <button className="media-window-button" title="Maximize" type="button">
            <Square className="size-[15px]" />
          </button>
          <button
            className="media-window-button media-window-close"
            onClick={() => window.close()}
            title="Close"
            type="button"
          >
            <X className="size-[20px]" />
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden bg-[#f6f6f6]">
        {!item && (
          <div className="flex h-full items-center justify-center text-sm text-black/45">
            No media to preview
          </div>
        )}

        {item?.type === 'image' && (
          <ImagePreview item={item} resetKey={`${item.id}-${currentIndex}`} />
        )}
        {item?.type === 'video' && <VideoPreview item={item} />}

        {hasMultiple && (
          <>
            <button
              className="absolute left-5 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/88 text-black/60 shadow-lg backdrop-blur transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-25"
              disabled={currentIndex <= 0}
              onClick={() => go(-1)}
              title="Previous"
              type="button"
            >
              <ArrowLeft className="size-6" />
            </button>
            <button
              className="absolute right-5 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/88 text-black/60 shadow-lg backdrop-blur transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-25"
              disabled={currentIndex >= items.length - 1}
              onClick={() => go(1)}
              title="Next"
              type="button"
            >
              <ArrowRight className="size-6" />
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
