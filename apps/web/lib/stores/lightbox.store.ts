import { create } from 'zustand';
import type { MediaPreviewItem, MediaPreviewPayload } from '@c_chat/shared-types';

interface LightboxState {
  open: boolean;
  items: MediaPreviewItem[];
  index: number;
  openPreview: (payload: MediaPreviewPayload) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

const clampIndex = (index: number, length: number): number => {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
};

export const useLightboxStore = create<LightboxState>((set) => ({
  open: false,
  items: [],
  index: 0,

  openPreview: (payload) =>
    set({
      open: true,
      items: payload.items,
      index: clampIndex(payload.initialIndex, payload.items.length),
    }),

  close: () => set({ open: false }),

  next: () => set((state) => ({ index: clampIndex(state.index + 1, state.items.length) })),

  prev: () => set((state) => ({ index: clampIndex(state.index - 1, state.items.length) })),
}));
