import { dialog, BrowserWindow } from 'electron';
import { addActionHandler } from '../util';
import * as fs from 'fs';
import * as path from 'path';
import { stat } from 'fs/promises';
import {
  getFileTypeFromExtension,
  getMimeTypeFromExtension,
  to,
  uuidv4,
} from '@c_chat/shared-utils';
export type SelectUploadFilesParams = {
  filters?: Array<{ name: string; extensions: string[] }>;
  allowMultiSelect?: boolean;
};

// export const allFilters = getShowOpenDialogFilters('all');

/** 选择文件 */
addActionHandler('SelectFiles', async (params) => {
  const { allowMultiSelect = true, filters } = params;
  const browserWindow = BrowserWindow.getFocusedWindow() ?? undefined;
  if (!browserWindow) {
    return [];
  }
  const properties: Electron.OpenDialogOptions['properties'] = ['openFile'];
  if (allowMultiSelect) {
    properties.push('multiSelections');
  }

  const result = await dialog.showOpenDialog(browserWindow, {
    title: '选择要上传的文件',
    properties,
    filters,
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
      const mimeType = getMimeTypeFromExtension(fileExtension);

      return {
        id: uuidv4(),
        filePath,
        fileName,
        fileSize: stats.size,
        fileType: fileType,
        mimeType,
        extension: fileExtension,
        lastModified: stats.mtime.getTime(),
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    }),
  );

  return fileInfos.filter((info) => info !== null);
});

addActionHandler('ReadLocalFile', async (params) => {
  const { path } = params;
  if (!path) {
    throw new Error('缺少 filePath');
  }

  const data = await fs.promises.readFile(path);
  return data;
});
