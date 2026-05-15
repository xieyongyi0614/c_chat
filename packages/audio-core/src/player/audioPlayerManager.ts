import type { AudioPlayerState } from '../types/audio';

export class AudioPlayerManager {
  private audio = new Audio();

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

  constructor() {
    this.bindEvents();
  }

  private bindEvents() {
    this.audio.ontimeupdate = () => {
      const currentTime = this.audio.currentTime;

      this.updateState({
        currentTime,

        progressMap: {
          ...this.state.progressMap,

          [this.state.currentId!]: currentTime,
        },
      });
    };

    this.audio.onloadedmetadata = () => {
      this.updateState({
        duration: this.audio.duration,
      });
    };

    this.audio.onplay = () => {
      this.updateState({
        playing: true,
      });
    };

    this.audio.onpause = () => {
      this.updateState({
        playing: false,
      });
    };

    this.audio.onended = () => {
      const currentId = this.state.currentId;

      this.updateState({
        playing: false,

        currentTime: 0,

        progressMap: {
          ...this.state.progressMap,

          [currentId!]: 0,
        },
      });

      this.audio.currentTime = 0;
    };
  }

  async play(id: string, src: string) {
    if (this.state.currentId !== id) {
      this.audio.src = src;

      const savedTime = this.state.progressMap[id] || 0;
      this.audio.currentTime = savedTime;

      this.updateState({
        currentId: id,
        currentTime: savedTime,
      });
    }

    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();

    this.audio.currentTime = 0;

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
    this.audio.currentTime = time;

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
    this.audio.playbackRate = rate;

    this.updateState({
      playbackRate: rate,
    });
  }

  subscribe = (listener: (state: AudioPlayerState) => void) => {
    this.listeners.add(listener);
    console.log('this.listeners.size', this.listeners?.size);

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
