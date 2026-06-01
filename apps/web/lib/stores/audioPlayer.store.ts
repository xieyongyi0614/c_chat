import { create } from 'zustand';
import { audioPlayerManager, type AudioPlayerState } from '@c_chat/audio-core';

export const useAudioPlayerStore = create<AudioPlayerState>(() => audioPlayerManager.getState());
