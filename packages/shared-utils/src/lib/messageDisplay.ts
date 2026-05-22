import { MESSAGE_TYPE, type MessageType } from '@c_chat/shared-config';
/**
 * 根据消息类型生成会话列表显示的内容
 * 0:文本, 1:图片, 2:视频, 3:文件, 4:音频
 */
export const generateLastMsgContent = (type: MessageType, content?: string | null) => {
  if (content && content.trim()) {
    return content;
  }

  const typeMap: Record<number, string> = {
    [MESSAGE_TYPE.Text]: '',
    [MESSAGE_TYPE.Image]: '[图片]',
    [MESSAGE_TYPE.Video]: '[视频]',
    [MESSAGE_TYPE.File]: '[文件]',
    [MESSAGE_TYPE.Audio]: '[音频]',
  };

  return typeMap[type] || '[消息]';
};
