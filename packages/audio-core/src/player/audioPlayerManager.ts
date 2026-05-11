import type { AudioPlayerState } from '../types/audio';

export class AudioPlayerManager {
  private audio = new Audio();

  private state: AudioPlayerState = {
    playing: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
  };

  private listeners = new Set<(state: AudioPlayerState) => void>();

  constructor() {
    this.bindEvents();
  }

  private bindEvents() {
    this.audio.ontimeupdate = () => {
      this.updateState({
        currentTime: this.audio.currentTime,
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
      this.updateState({
        playing: false,
        currentTime: 0,
      });
    };
  }

  async play(id: string, src: string) {
    if (this.state.currentId !== id) {
      this.audio.src = src;

      this.updateState({
        currentId: id,
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
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  setPlaybackRate(rate: number) {
    this.audio.playbackRate = rate;

    this.updateState({
      playbackRate: rate,
    });
  }

  subscribe(listener: (state: AudioPlayerState) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<AudioPlayerState>) {
    this.state = {
      ...this.state,
      ...partial,
    };

    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const audioPlayerManager = new AudioPlayerManager();
