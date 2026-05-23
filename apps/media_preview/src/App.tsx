import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import type { MediaPreviewItem, MediaPreviewPayload } from '@c_chat/shared-types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@c_chat/ui';
import { ipc } from '@c_chat/shared-utils';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  Grid3X3,
  Info,
  Loader2,
  Maximize,
  Minus,
  MoreHorizontal,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
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
import { resolveMediaUrl, revokeObjectUrl } from './utils/media';

type ImageAction = 'zoom-in' | 'zoom-out' | 'rotate' | 'reset';
type DownloadStatus = 'idle' | 'saving' | 'saved' | 'canceled' | 'failed';

const normalizeIndex = (payload: MediaPreviewPayload | null) => {
  if (!payload?.items.length) return 0;
  return Math.max(0, Math.min(payload.initialIndex ?? 0, payload.items.length - 1));
};

const dispatchImageAction = (action: ImageAction) => {
  window.dispatchEvent(new CustomEvent('media-preview:image-action', { detail: action }));
};

const getMediaName = (item?: MediaPreviewItem | null) => {
  if (!item) return '媒体预览';
  return item.fileName || (item.type === 'video' ? '视频' : '图片');
};

const formatFileSize = (size?: number) => {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const formatDuration = (duration?: number) => {
  if (!duration) return '-';
  const total = Math.round(duration);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const getDownloadName = (item: MediaPreviewItem) => {
  if (item.fileName) return item.fileName;
  const extension = item.type === 'video' ? 'mp4' : 'jpg';
  return `${item.type}-${Date.now()}.${extension}`;
};

const getDownloadFilters = (item: MediaPreviewItem) => {
  const fileName = getDownloadName(item);
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension) {
    return [{ name: extension.toUpperCase(), extensions: [extension] }];
  }

  return item.type === 'video'
    ? [{ name: '视频', extensions: ['mp4', 'mov', 'webm'] }]
    : [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }];
};

interface PreviewThumbProps {
  item: MediaPreviewItem;
}

function PreviewThumb({ item }: PreviewThumbProps) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    resolveMediaUrl(item)
      .then((url) => {
        if (!active) {
          revokeObjectUrl(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch((error) => {
        console.error('Failed to load thumbnail:', error);
        if (active) setSrc('');
      });

    return () => {
      active = false;
      revokeObjectUrl(objectUrl);
    };
  }, [item]);

  if (!src) {
    return (
      <div className="grid size-12 place-items-center rounded bg-black/5 text-[10px] text-black/45">
        加载
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <video src={src} className="size-12 rounded bg-black object-cover" muted preload="metadata" />
    );
  }

  return <img src={src} alt={getMediaName(item)} className="size-12 rounded object-cover" />;
}

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
  const hasMultiple = items.length > 1;
  const previewTitle = useMemo(() => getMediaName(item), [item]);

  const currentMeta = useMemo(() => {
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

  const toolbarButton = (
    label: string,
    children: React.ReactNode,
    props: React.ButtonHTMLAttributes<HTMLButtonElement> = {},
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button {...props} className={cn('media-toolbar-button', props.className)} type="button">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col bg-[#f5f5f5] text-[#202124]">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-black/8 bg-[#e7e7e9] px-4 shadow-sm [-webkit-app-region:drag]">
          <div className="flex min-w-0 items-center gap-2 [-webkit-app-region:no-drag]">
            {toolbarButton(alwaysOnTop ? '取消置顶' : '置顶窗口', <Pin className="size-[22px]" />, {
              onClick: toggleAlwaysOnTop,
              className: alwaysOnTop ? 'is-active' : '',
              'aria-pressed': alwaysOnTop,
            })}
            <div className="mx-1 h-7 w-px bg-black/12" />
            {toolbarButton('上一张', <ArrowLeft className="size-[22px]" />, {
              onClick: () => go(-1),
              disabled: currentIndex <= 0,
            })}
            {toolbarButton('下一张', <ArrowRight className="size-[22px]" />, {
              onClick: () => go(1),
              disabled: currentIndex >= items.length - 1,
            })}
            {toolbarButton(
              showThumbnails ? '隐藏缩略图' : '显示缩略图',
              showThumbnails ? (
                <PanelRightClose className="size-[22px]" />
              ) : (
                <Grid3X3 className="size-[22px]" />
              ),
              {
                onClick: () => setShowThumbnails((value) => !value),
                className: showThumbnails ? 'is-active' : '',
                'aria-pressed': showThumbnails,
              },
            )}
            <div className="mx-1 h-7 w-px bg-black/12" />
            {toolbarButton('放大', <ZoomIn className="size-[22px]" />, {
              disabled: item?.type !== 'image',
              onClick: () => dispatchImageAction('zoom-in'),
            })}
            {toolbarButton('缩小', <ZoomOut className="size-[22px]" />, {
              disabled: item?.type !== 'image',
              onClick: () => dispatchImageAction('zoom-out'),
            })}
            {toolbarButton('重置大小', <Maximize className="size-[22px]" />, {
              disabled: item?.type !== 'image',
              onClick: () => dispatchImageAction('reset'),
            })}
            <div className="mx-1 h-7 w-px bg-black/12" />
            {toolbarButton('裁剪暂不可用', <ScanText className="size-[22px]" />, {
              disabled: true,
            })}
            {toolbarButton('编辑暂不可用', <MousePointer2 className="size-[22px]" />, {
              disabled: true,
            })}
            {toolbarButton('旋转', <RotateCw className="size-[22px]" />, {
              disabled: item?.type !== 'image',
              onClick: () => dispatchImageAction('rotate'),
            })}
            {toolbarButton(
              downloading ? '下载中' : '下载',
              downloading ? (
                <Loader2 className="size-[22px] animate-spin" />
              ) : (
                <ArrowDownToLine className="size-[22px]" />
              ),
              {
                onClick: () => void handleDownload(),
                disabled: downloading || !item || (!item.url && !item.fileUrl && !item.filePath),
              },
            )}
            {downloadStatus !== 'idle' && (
              <span
                className={cn(
                  'min-w-16 text-xs',
                  downloadStatus === 'failed' ? 'text-red-600' : 'text-black/55',
                )}
              >
                {downloadStatus === 'saving' && '保存中...'}
                {downloadStatus === 'saved' && '已保存'}
                {downloadStatus === 'canceled' && '已取消'}
                {downloadStatus === 'failed' && '保存失败'}
              </span>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-w-0 flex-1 px-6 text-center [-webkit-app-region:drag]">
                <span className="inline-block max-w-[34vw] truncate align-middle text-sm font-medium text-black/70">
                  {previewTitle}
                </span>
                {items.length > 0 && (
                  <span className="ml-2 align-middle text-xs text-black/40">
                    {currentIndex + 1} / {items.length}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {previewTitle}
              {items.length > 0 ? ` (${currentIndex + 1} / ${items.length})` : ''}
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
            <Popover open={moreOpen} onOpenChange={setMoreOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className={cn('media-toolbar-button', moreOpen && 'is-active')}
                      title="更多"
                      type="button"
                    >
                      <MoreHorizontal className="size-[22px]" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>更多</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-52 p-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-black/5"
                  onClick={() => {
                    setShowInfo((value) => !value);
                    setMoreOpen(false);
                  }}
                >
                  <span>详细信息</span>
                  {showInfo && <Check className="size-4" />}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-black/5"
                  onClick={() => {
                    setShowThumbnails((value) => !value);
                    setMoreOpen(false);
                  }}
                >
                  <span>缩略图</span>
                  {showThumbnails && <Check className="size-4" />}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-black/5"
                  onClick={() => {
                    toggleAlwaysOnTop();
                    setMoreOpen(false);
                  }}
                >
                  <span>{alwaysOnTop ? '取消置顶' : '置顶窗口'}</span>
                  {alwaysOnTop && <Check className="size-4" />}
                </button>
              </PopoverContent>
            </Popover>
            <div className="mx-1 h-7 w-px bg-black/12" />
            {toolbarButton('最小化', <Minus className="size-[18px]" />, {
              className: 'media-window-button',
              onClick: () => window.c_chat.minimizeCurrentWindow(),
            })}
            {toolbarButton(
              isMaximized ? '还原' : '最大化',
              isMaximized ? (
                <PanelRightOpen className="size-[15px]" />
              ) : (
                <Square className="size-[15px]" />
              ),
              {
                className: 'media-window-button',
                onClick: toggleMaximize,
              },
            )}
            {toolbarButton('关闭', <X className="size-[20px]" />, {
              className: 'media-window-button media-window-close',
              onClick: () => window.close(),
            })}
          </div>
        </header>

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
                      index === currentIndex
                        ? 'border-black/20 bg-black/6'
                        : 'border-black/8 bg-white',
                    )}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <PreviewThumb item={thumbItem} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-black/80">
                        {getMediaName(thumbItem)}
                      </div>
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
                onClick={() => go(-1)}
                title="上一张"
                type="button"
              >
                <ArrowLeft className="size-6" />
              </button>
              <button
                className="absolute right-5 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/88 text-black/60 shadow-lg backdrop-blur transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-25"
                disabled={currentIndex >= items.length - 1}
                onClick={() => go(1)}
                title="下一张"
                type="button"
              >
                <ArrowRight className="size-6" />
              </button>
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
