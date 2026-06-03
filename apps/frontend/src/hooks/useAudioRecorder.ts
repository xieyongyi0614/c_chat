import { useEffect, useRef, useState } from 'react';

import { AudioRecorder, AudioRecordError } from '@c_chat/audio-core';
import { toast } from 'sonner';
import { TOAST_ID } from '@c_chat/shared-config';

const getAudioRecordError = (err: unknown) =>
  err instanceof AudioRecordError ? err : new AudioRecordError('UNKNOWN', 'Unknown error');

export function useAudioRecorder() {
  const recorderRef = useRef<AudioRecorder>(undefined);

  const timerRef = useRef<number>(undefined);

  const [isRecording, setIsRecording] = useState(false);

  const [duration, setDuration] = useState(0);

  const [waveform, setWaveform] = useState<number[]>([]);

  const [error, setError] = useState<AudioRecordError | null>(null);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();

      clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    try {
      setError(null);

      setWaveform([]);

      setDuration(0);

      const recorder = new AudioRecorder();

      recorderRef.current = recorder;

      await recorder.start();

      setIsRecording(true);

      recorder.onWaveform((data) => {
        setWaveform([...data]);
      });

      const startTime = Date.now();

      timerRef.current = window.setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 100);
    } catch (err: unknown) {
      const recordError = getAudioRecordError(err);
      setError(recordError);
      toast.error(recordError.message, { id: recordError.code || TOAST_ID.UNKNOWN });
      throw err;
    }
  };

  const stop = async () => {
    if (!recorderRef.current) {
      return null;
    }

    clearInterval(timerRef.current);

    setIsRecording(false);
    try {
      const result = await recorderRef.current.stop();
      const durationSec = Math.max(1, Math.round(duration / 1000));
      return { ...result, duration: durationSec };
    } catch (err: unknown) {
      const recordError = getAudioRecordError(err);
      toast.error(recordError.message, { id: recordError.code || TOAST_ID.UNKNOWN });
      throw err;
    }
  };

  const cancel = () => {
    recorderRef.current?.cancel();

    clearInterval(timerRef.current);

    setIsRecording(false);

    setDuration(0);

    setWaveform([]);
  };

  return {
    isRecording,
    duration,
    waveform,
    error,
    recording: { start, stop, cancel },
  };
}
