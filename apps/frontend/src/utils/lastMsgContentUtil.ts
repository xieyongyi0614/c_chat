/**
 * 根据消息类型生成会话列表显示的内容
 * 0:文本, 1:图片, 2:视频, 3:文件, 4:音频
 */
export const generateLastMsgContent = (content: string | null, type: number) => {
  if (content && content.trim()) {
    return content;
  }

  const typeMap: Record<number, string> = {
    0: '',
    1: '[图片]',
    2: '[视频]',
    3: '[文件]',
    4: '[音频]',
  };
  return typeMap[type] || '[消息]';
};
