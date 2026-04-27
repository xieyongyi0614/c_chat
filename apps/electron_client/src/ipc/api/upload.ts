import { dialog, BrowserWindow } from 'electron';
import { addActionHandler } from '../util';
import { storeTableClass } from '../../db';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { stat } from 'fs/promises';
import { getFileTypeFromExtension, getMimeTypeFromExtension, to } from '@c_chat/shared-utils';
export type SelectUploadFilesParams = {
  filters?: Array<{ name: string; extensions: string[] }>;
  allowMultiSelect?: boolean;
};

export type UploadFileByChunksParams = {
  filePath: string;
  uploadUrl?: string;
  chunkSize?: number;
  description?: string;
  alt?: string;
  headers?: Record<string, string>;
};

export type UploadFileByChunksResult = {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number;
  isComplete: boolean;
  serverResponse?: any;
};

const DEFAULT_CHUNK_SIZE = 3 * 1024 * 1024; // 3MB
const DEFAULT_UPLOAD_URL = 'http://localhost:3001/api/upload/chunk';
/** 选择文件 */
addActionHandler('SelectFiles', async (params) => {
  const browserWindow = BrowserWindow.getFocusedWindow() ?? undefined;
  if (!browserWindow) {
    return [];
  }
  const properties: Electron.OpenDialogOptions['properties'] = ['openFile'];
  if (params.allowMultiSelect) {
    properties.push('multiSelections');
  }

  const result = await dialog.showOpenDialog(browserWindow, {
    title: '选择要上传的文件',
    properties,
    filters: params.filters,
  });

  if (result.canceled) {
    return [];
  }

  // 获取文件详细信息
  const fileInfos = await Promise.all(
    result.filePaths.map(async (filePath) => {
      const [err, stats] = await to(stat(filePath));
      if (err) {
        console.error(`Error getting file stats for ${filePath}:`, err);
        return null;
      }
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();

      const fileType = getFileTypeFromExtension(fileExtension);

      return {
        id: uuidv4(),
        filePath,
        fileName,
        fileSize: stats.size,
        fileType: fileType,
        mimeType: getMimeTypeFromExtension(fileExtension),
        extension: fileExtension,
        lastModified: stats.mtime.getTime(), // 时间戳
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        buffer: fileType === 'image' ? fs.readFileSync(filePath) : null,
      };
    }),
  );

  return fileInfos.filter((info) => info !== null);
});

addActionHandler('ReadLocalFile', async (params) => {
  if (!params?.filePath) {
    throw new Error('缺少 filePath');
  }

  const data = await fs.promises.readFile(params.filePath);
  return new Uint8Array(data);
});

addActionHandler('UploadFileByChunks', async (params) => {
  const chunkSize =
    params.chunkSize && params.chunkSize > 0 ? params.chunkSize : DEFAULT_CHUNK_SIZE;
  const uploadUrl = params.uploadUrl ?? DEFAULT_UPLOAD_URL;
  const filePath = params.filePath;

  if (!filePath) {
    throw new Error('缺少文件路径');
  }

  const stats = await fs.promises.stat(filePath);
  if (!stats.isFile()) {
    throw new Error('请选择一个有效文件');
  }

  const totalChunks = Math.max(1, Math.ceil(stats.size / chunkSize));
  const uploadId = `${uuidv4()}_${Date.now()}`;
  const fileName = path.basename(filePath);
  const token = storeTableClass.getAccessToken(params.windowId);

  let uploadedChunks = 0;
  let serverResponse: any = null;

  const readStream = fs.createReadStream(filePath, {
    highWaterMark: chunkSize,
  });

  for await (const chunk of readStream) {
    uploadedChunks += 1;
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('fileName', fileName);
    form.append('chunkIndex', String(uploadedChunks));
    form.append('totalChunks', String(totalChunks));
    form.append('fileSize', String(stats.size));
    if (params.description) form.append('description', params.description);
    if (params.alt) form.append('alt', params.alt);
    form.append('chunk', new Blob([chunk]), fileName);

    const headers: Record<string, string> = {
      ...(params.headers ?? {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      headers,
    });

    const json = await response.json();
    serverResponse = json;

    if (!response.ok) {
      throw new Error(json?.message || response.statusText || '文件分片上传失败');
    }
  }

  return {
    uploadId,
    fileName,
    fileSize: stats.size,
    totalChunks,
    uploadedChunks,
    isComplete: true,
    serverResponse,
  } as UploadFileByChunksResult;
});
