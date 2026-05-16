import { AUDIO_MIME } from '../constants/audio';
import { compressWaveform } from '../waveform/waveform';
import type { VoiceRecordResult } from '../types/audio';
import { AudioRecordError, AudioRecordErrorCode } from '../types/error';

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;

  private stream: MediaStream | null = null;

  private chunks: Blob[] = [];

  private startTime = 0;

  private audioContext: AudioContext | null = null;

  private analyser: AnalyserNode | null = null;

  private waveformListeners = new Set<(waveform: number[]) => void>();

  private waveform: number[] = [];

  private rafId = 0;

  get recording() {
    return this.mediaRecorder?.state === 'recording';
  }

  async start() {
    if (this.recording) {
      return;
    }

    try {
      if (!navigator.mediaDevices.getUserMedia) {
        throw new AudioRecordError(AudioRecordErrorCode.NOT_SUPPORTED, '设备不支持getUserMedia');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported(AUDIO_MIME.RECORD)) {
        throw new AudioRecordError(AudioRecordErrorCode.NOT_SUPPORTED, '设备不支持MediaRecorder');
      }

      this.audioContext = new AudioContext();

      const source = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = 256;

      source.connect(this.analyser);

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: AUDIO_MIME.RECORD });

      this.chunks = [];

      this.waveform = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      this.mediaRecorder.onerror = () => {
        this.cleanup();
      };

      this.mediaRecorder.start(100);

      this.startTime = Date.now();

      this.startWaveformCollect();
    } catch (error: any) {
      this.cleanup();

      if (error.name === 'NotAllowedError') {
        throw new AudioRecordError(AudioRecordErrorCode.PERMISSION_DENIED, '未启动麦克风权限');
      }

      if (error.name === 'NotFoundError') {
        throw new AudioRecordError(AudioRecordErrorCode.DEVICE_NOT_FOUND, '未找到麦克风');
      }

      if (error.name === 'NotReadableError') {
        throw new AudioRecordError(AudioRecordErrorCode.DEVICE_IN_USE, '麦克风正在使用中');
      }

      if (error instanceof AudioRecordError) {
        throw error;
      }

      throw new AudioRecordError(AudioRecordErrorCode.UNKNOWN, error?.message || '音频录制失败');
    }
  }

  async stop(): Promise<VoiceRecordResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not started'));

        return;
      }

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, {
          type: AUDIO_MIME.RECORD,
        });

        const duration = Date.now() - this.startTime;

        const waveform = compressWaveform(this.waveform);

        this.cleanup();

        resolve({
          blob,
          duration,
          waveform,
          mimeType: AUDIO_MIME.RECORD,
        });
      };

      this.mediaRecorder.stop();
    });
  }

  cancel() {
    this.cleanup();
  }

  private startWaveformCollect() {
    if (!this.analyser) {
      return;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const collect = () => {
      if (!this.analyser) {
        return;
      }

      this.analyser.getByteTimeDomainData(dataArray);

      let sum = 0;

      for (const item of dataArray) {
        sum += Math.abs(item - 128);
      }

      const avg = sum / dataArray.length;

      this.waveform.push(Math.min(100, Math.floor(avg)));

      this.rafId = requestAnimationFrame(collect);
    };

    collect();
  }

  private cleanup() {
    cancelAnimationFrame(this.rafId);

    this.stream?.getTracks().forEach((t) => t.stop());

    this.audioContext?.close();

    this.mediaRecorder = null;

    this.stream = null;

    this.audioContext = null;

    this.analyser = null;
  }

  onWaveform(listener: (waveform: number[]) => void) {
    this.waveformListeners.add(listener);

    return () => {
      this.waveformListeners.delete(listener);
    };
  }
}
