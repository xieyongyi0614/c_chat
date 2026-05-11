import { MessageTypeEnum } from '@c_chat/shared-types';

/**
 * 根据消息类型生成会话列表显示的内容
 * 0:文本, 1:图片, 2:视频, 3:文件, 4:音频
 */
export const generateLastMsgContent = (type: MessageTypeEnum, content?: string) => {
  if (content && content.trim()) {
    return content;
  }

  const typeMap: Record<number, string> = {
    [MessageTypeEnum.Text]: '',
    [MessageTypeEnum.Image]: '[图片]',
    [MessageTypeEnum.Video]: '[视频]',
    [MessageTypeEnum.File]: '[文件]',
    [MessageTypeEnum.Audio]: '[音频]',
  };
  return typeMap[type] || '[消息]';
};
