import type { MediaPreviewItem } from '@c_chat/shared-types';
import { cn } from '@c_chat/ui';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { PreviewThumb } from './PreviewThumb';
import { VideoPreview } from './VideoPreview';
import type { MediaMetaRow } from '../utils/preview';
import { getMediaName } from '../utils/preview';

interface MediaPreviewMainProps {
  currentIndex: number;
  currentMeta: MediaMetaRow[];
  hasMultiple: boolean;
  item?: MediaPreviewItem;
  items: MediaPreviewItem[];
  showInfo: boolean;
  showThumbnails: boolean;
  onCurrentIndexChange: (index: number) => void;
  onGo: (delta: number) => void;
}

export function MediaPreviewMain({
  currentIndex,
  currentMeta,
  hasMultiple,
  item,
  items,
  showInfo,
  showThumbnails,
  onCurrentIndexChange,
  onGo,
}: MediaPreviewMainProps) {
  return (
    <main className="relative flex-1 overflow-hidden bg-[#f6f6f6]">
      {showThumbnails && (
        <aside className="absolute left-0 top-0 z-20 h-full w-60 border-r border-black/8 bg-white/96 p-3 shadow-xl backdrop-blur">
          <div className="mb-3 text-xs font-medium text-black/45">缩略图</div>
          <div className="flex h-[calc(100%-1.5rem)] flex-col gap-2 overflow-y-auto">
            {items.map((thumbItem, index) => (
              <button
                key={thumbItem.id}
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-md border p-2 text-left transition',
                  index === currentIndex ? 'border-black/20 bg-black/6' : 'border-black/8 bg-white',
                )}
                onClick={() => onCurrentIndexChange(index)}
              >
                <PreviewThumb item={thumbItem} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-black/80">{getMediaName(thumbItem)}</div>
                  <div className="text-[10px] text-black/40">
                    {index + 1} / {items.length}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {showInfo && item && (
        <aside className="absolute right-0 top-0 z-20 h-full w-72 border-l border-black/8 bg-white/96 p-4 shadow-xl backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-black/45">
            <Info className="size-3.5" />
            详细信息
          </div>
          <div className="flex flex-col gap-3 text-sm">
            {currentMeta.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <span className="text-black/45">{label}</span>
                <span className="max-w-[65%] truncate text-right text-black/80">{value}</span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {!item && (
        <div className="flex h-full items-center justify-center text-sm text-black/45">
          没有可预览的媒体
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
            onClick={() => onGo(-1)}
            title="上一张"
            type="button"
          >
            <ArrowLeft className="size-6" />
          </button>
          <button
            className="absolute right-5 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/88 text-black/60 shadow-lg backdrop-blur transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-25"
            disabled={currentIndex >= items.length - 1}
            onClick={() => onGo(1)}
            title="下一张"
            type="button"
          >
            <ArrowRight className="size-6" />
          </button>
        </>
      )}
    </main>
  );
}
