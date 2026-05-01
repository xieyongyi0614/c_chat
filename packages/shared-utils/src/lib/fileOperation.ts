import { EXTENSION_TO_TYPE_MAP, fileMimeMap } from '@c_chat/shared-config';
import { FileInfoListItem } from '@c_chat/shared-types';

import { v4 as uuidv4 } from 'uuid';
export function getFileTypeFromExtension(extension: string): string {
  return EXTENSION_TO_TYPE_MAP[extension] || 'other';
}

// 根据文件扩展名获取 MIME 类型
export function getMimeTypeFromExtension(extension: string): string {
  return fileMimeMap[extension.toLowerCase()] || 'application/octet-stream';
}

export const bufferToFile = (file: { buffer: ArrayBuffer; type: string; name: string }) => {
  const blob = new Blob([file.buffer], { type: file.type });

  const realFile = new File([blob], file.name, {
    type: file.type,
  });
  return realFile;
};

export const bufferToPreviewUrl = (file: { buffer: ArrayBuffer; type: string }) => {
  const blob = new Blob([file.buffer], { type: file.type });
  return URL.createObjectURL(blob);
};

export const getSelectFileInfoByFile = async (file: File): Promise<FileInfoListItem> => {
  const preview = file.type.startsWith('image/')
    ? await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      })
    : undefined;

  const fileExtension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    : '';

  const fileName = file.name;

  return {
    id: uuidv4(),
    filePath: '',
    fileName,
    fileSize: file.size,
    fileType: getFileTypeFromExtension(fileExtension),
    mimeType: file.type,
    extension: fileExtension,
    lastModified: file.lastModified,
    isDirectory: false,
    isFile: true,
    url: preview,
  };
};
