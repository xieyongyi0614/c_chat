import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import type { MediaPreviewPayload } from '@c_chat/shared-types';
import { TooltipProvider } from '@c_chat/ui';
import { ipc } from '@c_chat/shared-utils';
import { useEffect, useMemo, useState } from 'react';
import { MediaPreviewHeader } from './components/MediaPreviewHeader';
import { MediaPreviewMain } from './components/MediaPreviewMain';
import { resolveMediaUrl, revokeObjectUrl } from './utils/media';
import {
  type DownloadStatus,
  type ImageAction,
  type MediaMetaRow,
  formatDuration,
  formatFileSize,
  getDownloadFilters,
  getDownloadName,
  getMediaName,
  normalizeIndex,
} from './utils/preview';

const dispatchImageAction = (action: ImageAction) => {
  window.dispatchEvent(new CustomEvent('media-preview:image-action', { detail: action }));
};

function App() {
  const [payload, setPayload] = useState<MediaPreviewPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');

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
  const previewTitle = useMemo(() => getMediaName(item), [item]);
  const hasMultiple = items.length > 1;

  const currentMeta = useMemo<MediaMetaRow[]>(() => {
    if (!item) return [];
    return [
      ['名称', getMediaName(item)],
      ['类型', item.type === 'video' ? '视频' : '图片'],
      ['大小', formatFileSize(item.fileSize)],
      ['尺寸', item.width && item.height ? `${item.width} x ${item.height}` : '-'],
      ['时长', formatDuration(item.duration)],
    ];
  }, [item]);

  const go = (delta: number) => {
    if (!items.length) return;
    setCurrentIndex((value) => Math.max(0, Math.min(value + delta, items.length - 1)));
  };

  const handleDownload = async () => {
    if (!item || downloading) return;
    setDownloading(true);
    setDownloadStatus('saving');
    let sourceUrl = '';

    try {
      sourceUrl = await resolveMediaUrl(item);
      if (!sourceUrl) return;

      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Download source failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const result = await ipc.SaveFile({
        fileName: getDownloadName(item),
        data: Array.from(new Uint8Array(buffer)),
        filters: getDownloadFilters(item),
      });

      setDownloadStatus(result.canceled ? 'canceled' : 'saved');
    } catch (error) {
      console.error('Failed to download media:', error);
      setDownloadStatus('failed');
    } finally {
      revokeObjectUrl(sourceUrl);
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (downloadStatus === 'idle' || downloadStatus === 'saving') return;

    const timer = window.setTimeout(() => setDownloadStatus('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [downloadStatus]);

  const toggleAlwaysOnTop = () => {
    setAlwaysOnTop(window.c_chat.toggleCurrentWindowAlwaysOnTop());
  };

  const toggleMaximize = () => {
    window.c_chat.toggleCurrentWindowMaximize();
    setIsMaximized((value) => !value);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showThumbnails) {
          setShowThumbnails(false);
          return;
        }
        if (showInfo) {
          setShowInfo(false);
          return;
        }
        if (moreOpen) {
          setMoreOpen(false);
          return;
        }
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
  }, [items.length, item?.type, showInfo, showThumbnails, moreOpen]);

  useEffect(() => {
    const onResize = () => {
      setIsMaximized(
        Boolean(window.screen.availWidth && window.outerWidth >= window.screen.availWidth - 2),
      );
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col bg-[#f5f5f5] text-[#202124]">
        <MediaPreviewHeader
          alwaysOnTop={alwaysOnTop}
          currentIndex={currentIndex}
          downloadStatus={downloadStatus}
          downloading={downloading}
          isMaximized={isMaximized}
          item={item}
          itemsLength={items.length}
          moreOpen={moreOpen}
          previewTitle={previewTitle}
          showThumbnails={showThumbnails}
          onClose={() => window.close()}
          onDownload={() => void handleDownload()}
          onGo={go}
          onImageAction={dispatchImageAction}
          onMinimize={() => window.c_chat.minimizeCurrentWindow()}
          onMoreOpenChange={setMoreOpen}
          onToggleAlwaysOnTop={toggleAlwaysOnTop}
          onToggleInfo={() => setShowInfo((value) => !value)}
          onToggleMaximize={toggleMaximize}
          onToggleThumbnails={() => setShowThumbnails((value) => !value)}
        />
        <MediaPreviewMain
          currentIndex={currentIndex}
          currentMeta={currentMeta}
          hasMultiple={hasMultiple}
          item={item}
          items={items}
          showInfo={showInfo}
          showThumbnails={showThumbnails}
          onCurrentIndexChange={setCurrentIndex}
          onGo={go}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
