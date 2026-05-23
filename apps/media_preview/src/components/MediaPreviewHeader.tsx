import type { MediaPreviewItem } from '@c_chat/shared-types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@c_chat/ui';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  Grid3X3,
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
import type React from 'react';
import type { DownloadStatus } from '../utils/preview';

interface MediaPreviewHeaderProps {
  alwaysOnTop: boolean;
  currentIndex: number;
  downloadStatus: DownloadStatus;
  downloading: boolean;
  isMaximized: boolean;
  item?: MediaPreviewItem;
  itemsLength: number;
  moreOpen: boolean;
  previewTitle: string;
  showThumbnails: boolean;
  onClose: () => void;
  onDownload: () => void;
  onGo: (delta: number) => void;
  onImageAction: (action: 'zoom-in' | 'zoom-out' | 'rotate' | 'reset') => void;
  onMinimize: () => void;
  onMoreOpenChange: (open: boolean) => void;
  onToggleAlwaysOnTop: () => void;
  onToggleInfo: () => void;
  onToggleMaximize: () => void;
  onToggleThumbnails: () => void;
}

export function MediaPreviewHeader({
  alwaysOnTop,
  currentIndex,
  downloadStatus,
  downloading,
  isMaximized,
  item,
  itemsLength,
  moreOpen,
  previewTitle,
  showThumbnails,
  onClose,
  onDownload,
  onGo,
  onImageAction,
  onMinimize,
  onMoreOpenChange,
  onToggleAlwaysOnTop,
  onToggleInfo,
  onToggleMaximize,
  onToggleThumbnails,
}: MediaPreviewHeaderProps) {
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
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-black/8 bg-[#e7e7e9] px-4 shadow-sm [-webkit-app-region:drag]">
      <div className="flex min-w-0 items-center gap-2 [-webkit-app-region:no-drag]">
        {toolbarButton(alwaysOnTop ? '取消置顶' : '置顶窗口', <Pin className="size-[22px]" />, {
          onClick: onToggleAlwaysOnTop,
          className: alwaysOnTop ? 'is-active' : '',
          'aria-pressed': alwaysOnTop,
        })}
        <div className="mx-1 h-7 w-px bg-black/12" />
        {toolbarButton('上一张', <ArrowLeft className="size-[22px]" />, {
          onClick: () => onGo(-1),
          disabled: currentIndex <= 0,
        })}
        {toolbarButton('下一张', <ArrowRight className="size-[22px]" />, {
          onClick: () => onGo(1),
          disabled: currentIndex >= itemsLength - 1,
        })}
        {toolbarButton(
          showThumbnails ? '隐藏缩略图' : '显示缩略图',
          showThumbnails ? (
            <PanelRightClose className="size-[22px]" />
          ) : (
            <Grid3X3 className="size-[22px]" />
          ),
          {
            onClick: onToggleThumbnails,
            className: showThumbnails ? 'is-active' : '',
            'aria-pressed': showThumbnails,
          },
        )}
        <div className="mx-1 h-7 w-px bg-black/12" />
        {toolbarButton('放大', <ZoomIn className="size-[22px]" />, {
          disabled: item?.type !== 'image',
          onClick: () => onImageAction('zoom-in'),
        })}
        {toolbarButton('缩小', <ZoomOut className="size-[22px]" />, {
          disabled: item?.type !== 'image',
          onClick: () => onImageAction('zoom-out'),
        })}
        {toolbarButton('重置大小', <Maximize className="size-[22px]" />, {
          disabled: item?.type !== 'image',
          onClick: () => onImageAction('reset'),
        })}
        <div className="mx-1 h-7 w-px bg-black/12" />
        {toolbarButton('裁剪暂不可用', <ScanText className="size-[22px]" />, { disabled: true })}
        {toolbarButton('编辑暂不可用', <MousePointer2 className="size-[22px]" />, {
          disabled: true,
        })}
        {toolbarButton('旋转', <RotateCw className="size-[22px]" />, {
          disabled: item?.type !== 'image',
          onClick: () => onImageAction('rotate'),
        })}
        {toolbarButton(
          downloading ? '下载中' : '下载',
          downloading ? (
            <Loader2 className="size-[22px] animate-spin" />
          ) : (
            <ArrowDownToLine className="size-[22px]" />
          ),
          {
            onClick: onDownload,
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
            {itemsLength > 0 && (
              <span className="ml-2 align-middle text-xs text-black/40">
                {currentIndex + 1} / {itemsLength}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {previewTitle}
          {itemsLength > 0 ? ` (${currentIndex + 1} / ${itemsLength})` : ''}
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
        <Popover open={moreOpen} onOpenChange={onMoreOpenChange}>
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
                onToggleInfo();
                onMoreOpenChange(false);
              }}
            >
              <span>详细信息</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => {
                onToggleThumbnails();
                onMoreOpenChange(false);
              }}
            >
              <span>缩略图</span>
              {showThumbnails && <Check className="size-4" />}
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => {
                onToggleAlwaysOnTop();
                onMoreOpenChange(false);
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
          onClick: onMinimize,
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
            onClick: onToggleMaximize,
          },
        )}
        {toolbarButton('关闭', <X className="size-[20px]" />, {
          className: 'media-window-button media-window-close',
          onClick: onClose,
        })}
      </div>
    </header>
  );
}
