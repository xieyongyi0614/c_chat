import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';
import { bufferToPreviewUrl, ipc } from '@c_chat/shared-utils';
import { formatFileUrl } from '@c_chat/frontend/common/formatFileUrl';
import MessageDate from '../MessageDate';

interface ImageGroupProps {
  messages: LocalMessageListItem[];
  isMe: boolean;
  isRead: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

interface ImagePreviewProps {
  msg: LocalMessageListItem;
  idx: number;
  imgClass: string;
  containerStyle?: CSSProperties;
}

const ImagePreview = ({ msg, idx, imgClass, containerStyle }: ImagePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    const loadPreview = async () => {
      if (msg.fileUrl) {
        if (active) setPreviewUrl(formatFileUrl(msg.fileUrl));
        return;
      }

      if (!msg.filePath) {
        if (active) setPreviewUrl('');
        return;
      }

      try {
        const buffer = await ipc.ReadLocalFile({ path: msg.filePath });
        objectUrl = bufferToPreviewUrl({ buffer, type: msg.mimeType || 'image/*' });
        if (active) setPreviewUrl(objectUrl);
      } catch (error) {
        console.error('Failed to load local image preview:', error);
        if (active) setPreviewUrl('');
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [msg.filePath, msg.fileUrl, msg.mimeType]);

  const renderOverlay = () => {
    const isUploading = msg.status === MessageStatusEnum.uploading;
    const isSending = msg.status === MessageStatusEnum.sending;
    const isFailed = msg.status === MessageStatusEnum.fail;

    if (isUploading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
          <div className="mb-1 h-1 w-1/2 rounded-full bg-white/40">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${msg.progress || 0}%` }}
            />
          </div>
          <span className="text-[9px] text-white">{msg.progress || 0}%</span>
        </div>
      );
    }

    if (isSending) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-[10px] text-white">失败</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-100" style={containerStyle}>
      {previewUrl ? (
        <img src={previewUrl} alt={`图片 ${idx + 1}`} className={imgClass} />
      ) : (
        <div className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground">
          加载中
        </div>
      )}
      {renderOverlay()}
    </div>
  );
};

const ImageGroup = ({ messages, isMe, isRead, onRetry, retrying }: ImageGroupProps) => {
  const count = messages.length;
  const groupStatus = (() => {
    if (messages.some((item) => item.status === MessageStatusEnum.fail)) {
      return MessageStatusEnum.fail;
    }
    if (messages.some((item) => item.status === MessageStatusEnum.uploading)) {
      return MessageStatusEnum.uploading;
    }
    if (messages.some((item) => item.status === MessageStatusEnum.sending)) {
      return MessageStatusEnum.sending;
    }
    return messages[0]?.status ?? MessageStatusEnum.default;
  })();
  const groupTime = messages[0]?.createTime ?? Date.now();

  const renderDate = () => (
    <div className="flex pointer-events-auto absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-white backdrop-blur-sm [&_span]:text-white">
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
    const m = messages[0];
    return (
      <div className="relative grid max-w-xs grid-cols-1">
        <ImagePreview msg={m} idx={0} imgClass="rounded-xl object-contain" />
        {renderDate()}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="relative grid max-w-xs grid-cols-2 gap-1">
        {messages.map((m, i) => (
          <ImagePreview key={m.id} msg={m} idx={i} imgClass="h-44 w-full object-cover" />
        ))}
        {renderDate()}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="relative grid max-w-xs grid-cols-1 grid-rows-3 gap-1">
        {messages.map((m, i) => (
          <ImagePreview key={m.id} msg={m} idx={i} imgClass="h-44 w-full object-cover" />
        ))}
        {renderDate()}
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="relative grid max-w-xs grid-cols-2 gap-1">
        {messages.map((m, i) => (
          <ImagePreview key={m.id} msg={m} idx={i} imgClass="h-40 w-full object-cover" />
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
      {showMessages.map((m, i) => (
        <ImagePreview key={m.id} msg={m} idx={i} imgClass="h-28 w-full object-cover" />
      ))}
      {renderDate()}
    </div>
  );
};

export default memo(ImageGroup);
