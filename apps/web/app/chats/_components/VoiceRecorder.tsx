'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { Button, cn } from '@c_chat/ui';
import {
  AudioRecorder,
  AudioRecordError,
  AudioRecordErrorCode,
  formatDuration,
} from '@c_chat/audio-core';
import { uploadManager } from '@/lib/services';
import { MESSAGE_TYPE } from '@c_chat/shared-config';
import {
  VOICE_MAX_DURATION_MS,
  VOICE_MIN_DURATION_MS,
  normalizeAndEncodeWaveform,
} from '@/lib/media/waveform';

interface VoiceRecorderProps {
  conversationId: string;
  onSent: () => void;
  disabled?: boolean;
}

const ERROR_MESSAGE: Record<string, string> = {
  [AudioRecordErrorCode.PERMISSION_DENIED]: '麦克风权限被拒绝',
  [AudioRecordErrorCode.DEVICE_NOT_FOUND]: '未找到麦克风设备',
  [AudioRecordErrorCode.DEVICE_IN_USE]: '麦克风正被占用',
  [AudioRecordErrorCode.NOT_SUPPORTED]: '当前浏览器不支持录音',
  [AudioRecordErrorCode.START_FAILED]: '录音启动失败',
  [AudioRecordErrorCode.UNKNOWN]: '录音失败',
};

export function VoiceRecorder({ conversationId, onSent, disabled = false }: VoiceRecorderProps) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    timerRef.current = null;
    maxTimeoutRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimers();
      recorderRef.current?.cancel();
    };
  }, []);

  const start = async () => {
    if (disabled || recording) return;
    setError(null);
    const recorder = new AudioRecorder();
    try {
      await recorder.start();
    } catch (err) {
      const code = err instanceof AudioRecordError ? err.code : AudioRecordErrorCode.UNKNOWN;
      setError(ERROR_MESSAGE[code]);
      return;
    }
    recorderRef.current = recorder;
    setElapsed(0);
    setRecording(true);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 200);
    }, 200);
    maxTimeoutRef.current = setTimeout(() => {
      void stopAndSend();
    }, VOICE_MAX_DURATION_MS);
  };

  const cancel = () => {
    clearTimers();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(false);
    setElapsed(0);
  };

  const stopAndSend = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    clearTimers();
    recorderRef.current = null;
    setRecording(false);

    const result = await recorder.stop();
    if (result.duration < VOICE_MIN_DURATION_MS) {
      setError('录音时间太短');
      return;
    }

    const seconds = Math.max(1, Math.round(result.duration / 1000));
    const file = new File([result.blob], `voice_${Date.now()}.webm`, { type: result.mimeType });
    await uploadManager.upload({
      file,
      conversationId,
      duration: seconds,
      waveform: normalizeAndEncodeWaveform(result.waveform),
      messageType: MESSAGE_TYPE.Audio,
    });
    onSent();
  };

  if (recording) {
    return (
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="取消录音" onClick={cancel}>
          <X />
        </Button>
        <span className="min-w-10 text-center text-sm tabular-nums text-destructive">
          {formatDuration(elapsed)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="发送语音"
          onClick={() => {
            void stopAndSend();
          }}
        >
          <Send />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label="语音消息"
      title={error ?? undefined}
      className={cn(error && 'text-destructive')}
      onClick={() => {
        void start();
      }}
    >
      <Mic />
    </Button>
  );
}
