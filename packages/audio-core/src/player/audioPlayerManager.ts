import type { AudioPlayerState } from '../types/audio';

export class AudioPlayerManager {
  private audio?: HTMLAudioElement;

  private state: AudioPlayerState = {
    currentId: undefined,

    playing: false,

    currentTime: 0,

    duration: 0,

    playbackRate: 1,

    // 记录每条语音的播放进度
    progressMap: {},
  };

  private listeners = new Set<(state: AudioPlayerState) => void>();

  private getAudio() {
    if (!this.audio) {
      this.audio = new Audio();
      this.bindEvents(this.audio);
    }

    return this.audio;
  }

  private bindEvents(audio: HTMLAudioElement) {
    audio.ontimeupdate = () => {
      const currentTime = audio.currentTime;

      this.updateState({
        currentTime,

        progressMap: {
          ...this.state.progressMap,

          [this.state.currentId!]: currentTime,
        },
      });
    };

    audio.onloadedmetadata = () => {
      this.updateState({
        duration: audio.duration,
      });
    };

    audio.onplay = () => {
      this.updateState({
        playing: true,
      });
    };

    audio.onpause = () => {
      this.updateState({
        playing: false,
      });
    };

    audio.onended = () => {
      const currentId = this.state.currentId;

      this.updateState({
        playing: false,

        currentTime: 0,

        progressMap: {
          ...this.state.progressMap,

          [currentId!]: 0,
        },
      });

      audio.currentTime = 0;
    };
  }

  async play(id: string, src: string) {
    const audio = this.getAudio();

    if (this.state.currentId !== id) {
      audio.src = src;

      const savedTime = this.state.progressMap[id] || 0;
      audio.currentTime = savedTime;

      this.updateState({
        currentId: id,
        currentTime: savedTime,
      });
    }

    await audio.play();
  }

  pause() {
    this.audio?.pause();
  }

  stop() {
    const audio = this.audio;
    if (!audio) return;

    audio.pause();

    audio.currentTime = 0;

    if (this.state.currentId) {
      this.updateState({
        currentTime: 0,

        progressMap: {
          ...this.state.progressMap,

          [this.state.currentId]: 0,
        },
      });
    }
  }

  seek(time: number) {
    const audio = this.getAudio();
    audio.currentTime = time;

    if (this.state.currentId) {
      this.updateState({
        currentTime: time,

        progressMap: {
          ...this.state.progressMap,

          [this.state.currentId]: time,
        },
      });
    }
  }

  setPlaybackRate(rate: number) {
    const audio = this.getAudio();
    audio.playbackRate = rate;

    this.updateState({
      playbackRate: rate,
    });
  }

  subscribe = (listener: (state: AudioPlayerState) => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = () => {
    return this.state;
  };

  private updateState(partial: Partial<AudioPlayerState>) {
    this.state = { ...this.state, ...partial };

    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const audioPlayerManager = new AudioPlayerManager();
