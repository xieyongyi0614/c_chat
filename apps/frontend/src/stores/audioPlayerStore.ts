import { create } from 'zustand';

import type { AudioPlayerState } from '@c_chat/audio-core';

export type AudioPlayerStore = AudioPlayerState;

export const useAudioPlayerStore = create<AudioPlayerStore>(() => ({
  currentId: undefined,

  playing: false,

  currentTime: 0,

  duration: 0,

  playbackRate: 1,

  progressMap: {},
}));
