import { memo } from 'react';
import { MessageStatusEnum, type LocalMessageListItem } from '@c_chat/shared-types';

interface ImageGroupProps {
  messages: LocalMessageListItem[];
}

const ImageGroup = ({ messages }: ImageGroupProps) => {
  const count = messages.length;
  console.log('ImageGroup', JSON.stringify(messages));

  const renderOverlay = (msg: LocalMessageListItem) => {
    const isUploading = msg.status === MessageStatusEnum.uploading;
    const isSending = msg.status === MessageStatusEnum.sending;
    const isFailed = msg.status === MessageStatusEnum.fail;

    if (isUploading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
          <div className="w-1/2 bg-white/40 rounded-full h-1 mb-1">
            <div
              className="bg-white h-full rounded-full transition-all duration-300"
              style={{ width: `${msg.progress || 0}%` }}
            />
          </div>
          <span className="text-white text-[9px]">{msg.progress || 0}%</span>
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

    if (isFailed)
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-white text-[10px]">失败</span>
        </div>
      );

    return null;
  };

  const renderImg = (
    msg: LocalMessageListItem,
    idx: number,
    imgClass: string,
    containerStyle?: React.CSSProperties,
  ) => {
    return (
      <div
        key={msg.id}
        className="relative overflow-hidden rounded-xl bg-gray-100"
        style={containerStyle}
      >
        <img
          src={`http://localhost:3001${msg.fileUrl}`}
          alt={`图片 ${idx + 1}`}
          className={`${imgClass}`}
        />
        {renderOverlay(msg)}
      </div>
    );
  };

  // 单图：大图展示，保留纵横比
  if (count === 1) {
    const m = messages[0];
    return (
      <div className="grid grid-cols-1 max-w-xs">
        {renderImg(m, 0, 'object-contain rounded-xl')}
      </div>
    );
  }

  // 双图：左右布局
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 max-w-xs">
        {messages.map((m, i) => renderImg(m, i, 'w-full h-44 object-cover'))}
      </div>
    );
  }

  // 三图：（顺序下）
  if (count === 3) {
    return (
      <div className="grid grid-cols-1 grid-rows-3 gap-1 max-w-xs">
        {messages.map((m, i) => renderImg(m, i, 'w-full h-44 object-cover'))}
      </div>
    );
  }

  // 四图：2x2 九宫格
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-1 max-w-xs">
        {messages.map((m, i) => renderImg(m, i, 'w-full h-40 object-cover'))}
      </div>
    );
  }

  // 其他（5+）：简单网格，最多显示 9
  const showMessages = messages.slice(0, 9);
  const cols =
    showMessages.length === 5 ? 3 : Math.min(3, Math.ceil(Math.sqrt(showMessages.length)));
  return (
    <div
      className={`grid gap-1 max-w-xs cursor-pointer`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {showMessages.map((m, i) => renderImg(m, i, 'w-full h-28 object-cover'))}
    </div>
  );
};

export default memo(ImageGroup);
