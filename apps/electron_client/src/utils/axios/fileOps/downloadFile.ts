import * as fs from 'fs';
import type { IncomingMessage } from 'http';
import type { HttpClient } from '@c_chat/shared-api';

/**
 * Electron-only：流式下载到本地文件。使用原生 axios 实例做 stream 响应 + fs 写文件。
 */
export async function downloadFile(
  http: HttpClient,
  url: string,
  destinationPath: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const response = await http.getInstance()<IncomingMessage>({
    method: 'GET',
    url,
    responseType: 'stream',
  });

  const totalLength = parseInt(String(response.headers['content-length']), 10);
  let downloadedLength = 0;

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destinationPath);

    response.data.on('data', (chunk: Buffer) => {
      downloadedLength += chunk.length;
      if (onProgress && totalLength) {
        const progress = (downloadedLength / totalLength) * 100;
        onProgress(Math.round(progress));
      }
    });

    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log(`[HTTP] File downloaded successfully to: ${destinationPath}`);
      resolve();
    });

    writer.on('error', (err) => {
      console.error('[HTTP] Download error:', err);
      reject(err);
    });
  });
}
