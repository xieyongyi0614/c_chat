import { memo, useEffect, useState } from 'react';
import { MessageStatus } from '@c_chat/shared-types';
import { cn } from '../../../../lib/utils';
import MessageDate from './MessageDate';
import type { ImageGroupProps, ImagePreviewProps } from './types';

function ImagePreview({
  message,
  index,
  imgClassName,
  containerClassName,
  containerStyle,
  fileResolver,
  onOpen,
}: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    const loadPreview = async () => {
      if (message.fileUrl) {
        if (active) setPreviewUrl(fileResolver.formatFileUrl(message.fileUrl));
        return;
      }

      if (!message.filePath || !fileResolver.loadLocalPreview) {
        if (active) setPreviewUrl('');
        return;
      }

      try {
        const nextUrl = await fileResolver.loadLocalPreview(message);
        objectUrl = nextUrl.startsWith('blob:') ? nextUrl : '';
        if (active) setPreviewUrl(nextUrl);
      } catch (error) {
        console.error('Failed to load local image preview:', error);
        if (active) setPreviewUrl('');
      }
    };

    void loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileResolver, message]);

  const renderOverlay = () => {
    const isUploading = message.status === MessageStatus.uploading;
    const isSending = message.status === MessageStatus.sending;
    const isFailed = message.status === MessageStatus.fail;

    if (isUploading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/30">
          <div className="mb-1 h-1 w-1/2 rounded-full bg-background/40">
            <div
              className="h-full rounded-full bg-background transition-all duration-300"
              style={{ width: `${message.progress || 0}%` }}
            />
          </div>
          <span className="text-[9px] text-background">{message.progress || 0}%</span>
        </div>
      );
    }

    if (isSending) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
          <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
          <span className="text-[10px] text-background">失败</span>
        </div>
      );
    }

    return null;
  };

  return (
    <button
      type="button"
      className={cn('relative overflow-hidden bg-muted text-left', containerClassName)}
      style={containerStyle}
      onClick={() => onOpen?.(index)}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={`图片 ${index + 1}`} className={imgClassName} />
      ) : (
        <div className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground">
          加载中
        </div>
      )}
      {renderOverlay()}
    </button>
  );
}

const imageClassName = 'h-full w-full object-cover';

function getImageGroupLayout(count: number) {
  if (count === 2) {
    return {
      rootClassName:
        'relative grid h-56 max-w-[21rem] grid-cols-2 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: ['rounded-l-xl', 'rounded-r-xl'],
    };
  }

  if (count === 3) {
    return {
      rootClassName:
        'relative grid h-72 max-w-[21rem] grid-cols-[2fr_1fr] grid-rows-2 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: ['row-span-2 rounded-l-xl', 'rounded-tr-xl', 'rounded-br-xl'],
    };
  }

  if (count === 4) {
    return {
      rootClassName:
        'relative grid h-72 max-w-[21rem] grid-cols-2 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: ['rounded-tl-xl', 'rounded-tr-xl', 'rounded-bl-xl', 'rounded-br-xl'],
    };
  }

  if (count === 5) {
    return {
      rootClassName:
        'relative grid h-72 max-w-[21rem] grid-cols-6 grid-rows-2 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: [
        'col-span-3 rounded-tl-xl',
        'col-span-3 rounded-tr-xl',
        'col-span-2 rounded-bl-xl',
        'col-span-2',
        'col-span-2 rounded-br-xl',
      ],
    };
  }

  if (count === 6) {
    return {
      rootClassName:
        'relative grid h-72 max-w-[21rem] grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: ['rounded-tl-xl', '', 'rounded-tr-xl', 'rounded-bl-xl', '', 'rounded-br-xl'],
    };
  }

  if (count === 7) {
    return {
      rootClassName:
        'relative grid h-72 max-w-[21rem] grid-cols-6 grid-rows-3 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: [
        'col-span-2 rounded-tl-xl',
        'col-span-2',
        'col-span-2 rounded-tr-xl',
        'col-span-3',
        'col-span-3',
        'col-span-3 rounded-bl-xl',
        'col-span-3 rounded-br-xl',
      ],
    };
  }

  if (count === 8) {
    return {
      rootClassName:
        'relative grid h-72 max-w-[21rem] grid-cols-6 grid-rows-3 gap-0.5 overflow-hidden rounded-xl',
      itemClassNames: [
        'col-span-3 rounded-tl-xl',
        'col-span-3 rounded-tr-xl',
        'col-span-2',
        'col-span-2',
        'col-span-2',
        'col-span-2 rounded-bl-xl',
        'col-span-2',
        'col-span-2 rounded-br-xl',
      ],
    };
  }

  return {
    rootClassName:
      'relative grid h-72 max-w-[21rem] grid-cols-3 grid-rows-3 gap-0.5 overflow-hidden rounded-xl',
    itemClassNames: [
      'rounded-tl-xl',
      '',
      'rounded-tr-xl',
      '',
      '',
      '',
      'rounded-bl-xl',
      '',
      'rounded-br-xl',
    ],
  };
}

function ImageGroup({
  messages,
  isMe,
  isRead,
  onRetry,
  retrying,
  fileResolver,
  onOpenPreview,
}: ImageGroupProps) {
  const count = messages.length;
  const groupStatus = (() => {
    if (messages.some((item) => item.status === MessageStatus.fail)) {
      return MessageStatus.fail;
    }
    if (messages.some((item) => item.status === MessageStatus.uploading)) {
      return MessageStatus.uploading;
    }
    if (messages.some((item) => item.status === MessageStatus.sending)) {
      return MessageStatus.sending;
    }
    return messages[0]?.status ?? MessageStatus.default;
  })();
  const groupTime = messages[0]?.createTime ?? Date.now();

  const renderDate = () => (
    <div className="pointer-events-auto absolute bottom-1 right-1 flex rounded-full bg-foreground/55 px-1.5 py-0.5 text-background backdrop-blur-sm [&_span]:text-background">
      <MessageDate
        time={groupTime}
        status={groupStatus}
        isMe={isMe}
        isRead={isRead}
        onRetry={onRetry}
        retrying={retrying}
        className="float-none ml-0 text-[11px]"
      />
    </div>
  );

  if (count === 1) {
    const message = messages[0];
    return (
      <div className="relative grid max-w-[20rem] grid-cols-1">
        <ImagePreview
          message={message}
          index={0}
          imgClassName="block max-h-[28rem] max-w-[20rem] object-contain"
          containerClassName="rounded-xl"
          fileResolver={fileResolver}
          onOpen={onOpenPreview}
        />
        {renderDate()}
      </div>
    );
  }

  const showMessages = messages.slice(0, 9);
  const layout = getImageGroupLayout(showMessages.length);

  return (
    <div className={layout.rootClassName}>
      {showMessages.map((message, index) => (
        <ImagePreview
          key={message.id}
          message={message}
          index={index}
          imgClassName={imageClassName}
          containerClassName={layout.itemClassNames[index]}
          fileResolver={fileResolver}
          onOpen={onOpenPreview}
        />
      ))}
      {renderDate()}
    </div>
  );
}

export default memo(ImageGroup);
