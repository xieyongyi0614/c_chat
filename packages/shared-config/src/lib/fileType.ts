/** 0:文本, 1:图片, 2:文件, 3:音频, 4:视频 */
export const MESSAGE_TYPE = {
  Text: 0,
  Image: 1,
  File: 2,
  Audio: 3,
  Video: 4,
  // Location: 5,
  // Contact: 6,
  // Sticker: 7,
  // RedPacket: 8,
  // System: 9,
  // Call: 10,
  // Reply: 11,
  // Forward: 12,
  // Poll: 13,
  // Whiteboard: 14,
  // Markdown: 15,
} as const;
export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

export const FILE_TYPE = {
  IMAGE: 'image',

  VIDEO: 'video',

  AUDIO: 'audio',

  DOCUMENT: 'document',

  ARCHIVE: 'archive',

  APPLICATION: 'application',
} as const;

export type FileType = (typeof FILE_TYPE)[keyof typeof FILE_TYPE];

export const messageTypeMap: Record<FileType, MessageType> = {
  image: MESSAGE_TYPE.Image,
  video: MESSAGE_TYPE.Video,
  audio: MESSAGE_TYPE.Audio,
  document: MESSAGE_TYPE.File,
  archive: MESSAGE_TYPE.File,
  application: MESSAGE_TYPE.File,
};

export const fileTypeMap: Record<FileType, string[]> = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
  video: ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
  archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  application: ['.exe', '.app', '.dmg', '.pkg'],
};

// 预构建反向查找表: { '.jpg': 'image', '.mp4': 'video', ... }
export const EXTENSION_TO_TYPE_MAP = Object.entries(fileTypeMap).reduce(
  (acc, [type, extensions]) => {
    extensions.forEach((ext) => {
      acc[ext.toLowerCase()] = type as FileType;
    });
    return acc;
  },
  {} as Record<string, FileType>,
);

export const fileMimeMap: Record<string, string> = {
  // 图片
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',

  // 视频
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',

  // 音频
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/m4a',

  // 文档
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
};
