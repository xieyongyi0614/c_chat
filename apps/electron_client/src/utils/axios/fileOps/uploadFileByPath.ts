import fs from 'fs';
import path from 'path';
import type { UploadService } from '@c_chat/shared-api';
import { calcFileHashWithProgress, readChunkAsBlob } from '../../calcFileHash';

/**
 * Electron-only：从磁盘文件路径完整走 init → chunk × N → complete 流程。
 * 服务端命中秒传（uploadInit 直接返回 file）时跳过分片步骤。
 */
export async function uploadFileByPath(upload: UploadService, filePath: string) {
  const stat = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const fileSize = stat.size;
  const fileHash = await calcFileHashWithProgress(filePath);

  const uploadInit = await upload.uploadInit({ fileName, fileHash, fileSize });
  if (!uploadInit) {
    throw new Error('文件上传初始化失败');
  }

  if (uploadInit.file?.url) {
    return uploadInit.file;
  }

  const session = uploadInit.uploadSession;
  if (!session?.id) {
    throw new Error('文件上传会话创建失败');
  }

  const chunkSize = Number(session.chunkSize);
  const totalChunks = Math.max(1, Number(session.totalChunks ?? Math.ceil(fileSize / chunkSize)));

  for (let idx = 0; idx < totalChunks; idx++) {
    const chunk = await readChunkAsBlob(filePath, idx, chunkSize);
    const chunkRes = await upload.uploadChunk({
      uploadId: session.id,
      chunkIndex: idx,
      chunk,
      fileName,
      totalChunks,
      fileSize,
    });

    if (!chunkRes?.ok) {
      throw new Error('文件分片上传失败');
    }
  }

  const completeRes = await upload.uploadComplete({ uploadId: session.id, usage: 'file' });
  if (!completeRes?.file?.url) {
    throw new Error('文件合并失败');
  }

  return completeRes.file;
}
