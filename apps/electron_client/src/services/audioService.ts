import fs from 'node:fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { app } from 'electron';
import { encodeWaveformToBase64, getFileTypeFromExtension, uuidv4 } from '@c_chat/shared-utils';
import { AudioWaveformInfo, FileInfoListItem } from '@c_chat/shared-types';
import { unlink } from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath.path);
export class AudioService {
  private voiceDir = path.join(app.getPath('userData'), 'voice');

  constructor() {
    console.log('[AudioService] Initializing...', this.voiceDir);

    this.initDirectory();
  }

  private async initDirectory() {
    try {
      await fs.mkdir(this.voiceDir, { recursive: true });
    } catch (error) {
      console.error('[AudioService] Failed to create voice directory:', error);
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

    await fs.writeFile(tempPath, Buffer.from(buffer));

    // ffmpeg 转 opus
    await this.convertToOpus(tempPath, outputPath);

    // 获取文件信息
    const stat = await fs.stat(outputPath);

    await fs.unlink(tempPath);

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
        type: 'audio',
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

  convertToPCM(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(48000)
        .format('s16le')
        .save(output)
        .on('end', () => resolve())
        .on('error', reject);
    });
  }
  /** 获取音频信息 */

  async getAudioInfo(filePath: string): Promise<AudioWaveformInfo> {
    const metadata = await this.getMetadata(filePath);

    /**
     * ffmpeg 解码后的 PCM 文件
     */
    const pcmPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.pcm`);

    try {
      /**
       * 转 PCM
       */
      await this.convertToPCM(filePath, pcmPath);

      /**
       * 读取 PCM
       */
      const pcmBuffer = await fs.readFile(pcmPath);

      /**
       * Int16 PCM
       */
      const pcm = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength / 2);

      /**
       * waveform
       */
      const waveform = this.compressWaveform(pcm);

      return {
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        bitrate: metadata.bitrate,
        waveform,
        waveformBase64: encodeWaveformToBase64(waveform),
      };
    } finally {
      unlink(pcmPath).catch(() => {});
    }
  }
  getMetadata(filePath: string): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
    bitrate: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);

          return;
        }

        const stream = metadata.streams.find((s) => s.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration ?? 0,

          sampleRate: Number(stream?.sample_rate ?? 48000),

          channels: stream?.channels ?? 1,

          bitrate: Number(metadata.format.bit_rate ?? 0),
        });
      });
    });
  }
  compressWaveform(pcm: Int16Array, targetPoints = 80): number[] {
    if (!pcm.length) {
      return [];
    }

    const blockSize = Math.max(1, Math.floor(pcm.length / targetPoints));

    const peaks: number[] = [];

    for (let i = 0; i < pcm.length; i += blockSize) {
      const end = Math.min(i + blockSize, pcm.length);

      let peak = 0;

      for (let j = i; j < end; j++) {
        const value = Math.abs(pcm[j] / 32768);

        if (value > peak) {
          peak = value;
        }
      }

      peaks.push(peak);
    }

    return peaks.map((peak) => {
      /**
       * gamma
       */
      const v = Math.pow(peak, 0.7);

      return Math.max(0, Math.min(31, Math.round(v * 31)));
    });
  }
}
