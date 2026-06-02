import { memo, useEffect, useState } from 'react';
import { MessageStatus } from '@c_chat/shared-types';
import MessageDate from './MessageDate';
import type { ImageGroupProps, ImagePreviewProps } from './types';

function ImagePreview({
  message,
  index,
  imgClassName,
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
      className="relative overflow-hidden rounded-xl bg-muted text-left"
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
      <div className="relative grid max-w-xs grid-cols-1">
        <ImagePreview
          message={message}
          index={0}
          imgClassName="rounded-xl object-contain"
          fileResolver={fileResolver}
          onOpen={onOpenPreview}
        />
        {renderDate()}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="relative grid max-w-xs grid-cols-2 gap-1">
        {messages.map((message, index) => (
          <ImagePreview
            key={message.id}
            message={message}
            index={index}
            imgClassName="h-44 w-full object-cover"
            fileResolver={fileResolver}
            onOpen={onOpenPreview}
          />
        ))}
        {renderDate()}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="relative grid max-w-xs grid-cols-1 grid-rows-3 gap-1">
        {messages.map((message, index) => (
          <ImagePreview
            key={message.id}
            message={message}
            index={index}
            imgClassName="h-44 w-full object-cover"
            fileResolver={fileResolver}
            onOpen={onOpenPreview}
          />
        ))}
        {renderDate()}
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="relative grid max-w-xs grid-cols-2 gap-1">
        {messages.map((message, index) => (
          <ImagePreview
            key={message.id}
            message={message}
            index={index}
            imgClassName="h-40 w-full object-cover"
            fileResolver={fileResolver}
            onOpen={onOpenPreview}
          />
        ))}
        {renderDate()}
      </div>
    );
  }

  const showMessages = messages.slice(0, 9);
  const cols =
    showMessages.length === 5 ? 3 : Math.min(3, Math.ceil(Math.sqrt(showMessages.length)));

  return (
    <div
      className="relative grid max-w-xs cursor-pointer gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {showMessages.map((message, index) => (
        <ImagePreview
          key={message.id}
          message={message}
          index={index}
          imgClassName="h-28 w-full object-cover"
          fileResolver={fileResolver}
          onOpen={onOpenPreview}
        />
      ))}
      {renderDate()}
    </div>
  );
}

export default memo(ImageGroup);
