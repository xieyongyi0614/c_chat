'use client';

import { useEffect } from 'react';
import { audioPlayerManager } from '@c_chat/audio-core';
import { useAudioPlayerStore } from '@/lib/stores/audioPlayer.store';

export function AudioPlayerBridge() {
  useEffect(() => {
    useAudioPlayerStore.setState(audioPlayerManager.getState());
    return audioPlayerManager.subscribe((state) => {
      useAudioPlayerStore.setState(state);
    });
  }, []);

  return null;
}
