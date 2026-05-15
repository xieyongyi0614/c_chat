import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { app } from 'electron';
import { encodeWaveformToBase64, getFileTypeFromExtension, uuidv4 } from '@c_chat/shared-utils';
import { FileInfoListItem } from '@c_chat/shared-types';

ffmpeg.setFfmpegPath(ffmpegPath!);

export class AudioService {
  private voiceDir = path.join(app.getPath('userData'), 'voice');

  constructor() {
    console.log('[AudioService] Initializing...', this.voiceDir);
    if (!fs.existsSync(this.voiceDir)) {
      fs.mkdirSync(this.voiceDir, { recursive: true });
    }
  }

  async saveVoice(
    buffer: ArrayBuffer,
    metadata: {
      duration: number;
      waveform: number[];
      mimeType: string;
    },
  ): Promise<FileInfoListItem> {
    const id = uuidv4();
    const outputExt = '.ogg';
    const outputFileName = `${id}${outputExt}`;

    // temp webm
    const tempPath = path.join(this.voiceDir, `${id}.webm`);

    // final ogg
    const outputPath = path.join(this.voiceDir, outputFileName);

    // 保存临时文件
    fs.writeFileSync(tempPath, Buffer.from(buffer));

    // ffmpeg 转 opus
    await this.convertToOpus(tempPath, outputPath);

    // 获取文件信息
    const stat = fs.statSync(outputPath);

    // 删除 temp
    fs.unlinkSync(tempPath);
    const fileType = getFileTypeFromExtension(outputExt);
    console.log('saveVoice', stat);
    return {
      id,
      filePath: outputPath,
      fileName: outputFileName,
      fileSize: stat.size,
      fileType: fileType,
      mimeType: 'audio/ogg',
      extension: outputExt,
      lastModified: stat.mtime.getTime(),
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      metadata: {
        type: 'voice',
        ...metadata,
        size: stat.size,
        waveform: encodeWaveformToBase64(metadata.waveform),
      },
    };
  }

  private convertToOpus(input: string, output: string) {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(input)
        .audioCodec('libopus')
        .audioBitrate('32k')
        .format('ogg')
        .on('end', () => {
          resolve();
        })
        .on('error', reject)
        .save(output);
    });
  }
}
