import { useShallow } from 'zustand/react/shallow';
import { useAudioPlayerStore } from '../stores';

export function useAudioMessage(messageId: string) {
  return useAudioPlayerStore(
    useShallow((state) => {
      const isCurrent = state.currentId === messageId;

      return {
        playing: isCurrent && state.playing,

        currentTime: isCurrent ? state.currentTime : state.progressMap[messageId] || 0,

        duration: isCurrent ? state.duration : 0,
      };
    }),
  );
}
