import type { AudioMetadata } from '@c_chat/shared-types';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  MAX_EMPTY_WAVEFORM_POINTS,
  renderWaveform,
  seekLineSpikeAmounts,
} from '../common/helpers/waveform';
import { decodeWaveformFromBase64, interpolateArray } from '@c_chat/shared-utils';
const AVG_VOICE_DURATION = 10;
const useWaveformCanvas = (
  voice?: Pick<AudioMetadata, 'duration' | 'waveform'>,
  playProgress = 0,
  isOwn = false,
  isReverse = false,
) => {
  const theme: string = 'light';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: spikes, peak } =
    useMemo(() => {
      if (!voice) {
        return undefined;
      }

      const { waveform, duration } = voice;
      if (!waveform) {
        return {
          data: new Array(Math.min(duration, MAX_EMPTY_WAVEFORM_POINTS)).fill(0),
          peak: 0,
        };
      }

      const { MIN_SPIKES, MAX_SPIKES } = seekLineSpikeAmounts;
      const durationFactor = Math.min(duration / AVG_VOICE_DURATION, 1);
      const spikesCount = Math.round(MIN_SPIKES + (MAX_SPIKES - MIN_SPIKES) * durationFactor);
      const decodedWaveform = decodeWaveformFromBase64(waveform);

      return interpolateArray(decodedWaveform, spikesCount);
    }, [voice]) || {};

  useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !spikes || peak === undefined) {
      return;
    }

    const fillColor = theme === 'dark' ? '#494A78' : '#ADD3F7';
    const fillOwnColor = theme === 'dark' ? '#B7ABED' : '#AEDFA4';
    const progressFillColor = theme === 'dark' ? '#8774E1' : '#3390EC';
    const progressFillOwnColor = theme === 'dark' ? '#FFFFFF' : '#4FAE4E';

    const fillStyle = isOwn ? fillOwnColor : fillColor;
    const progressFillStyle = isOwn ? progressFillOwnColor : progressFillColor;

    renderWaveform(canvas, spikes, isReverse ? 1 - playProgress : playProgress, {
      peak,
      fillStyle,
      progressFillStyle,
    });
  }, [isOwn, peak, playProgress, spikes, theme, isReverse]);

  return canvasRef;
};

export default useWaveformCanvas;
