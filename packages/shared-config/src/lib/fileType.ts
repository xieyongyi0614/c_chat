export const fileTypes = ['image', 'video', 'audio', 'document', 'archive', 'application'] as const;

export const fileTypeMap: Record<(typeof fileTypes)[number], string[]> = {
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
      acc[ext.toLowerCase()] = type as (typeof fileTypes)[number];
    });
    return acc;
  },
  {} as Record<string, (typeof fileTypes)[number]>,
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
