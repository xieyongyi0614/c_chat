import { create } from 'zustand';

type GlobalState = {
  backdropLoading: boolean;
  backdropLoadingText: string | React.ReactNode | undefined;
  setBackdropLoading: (backdropLoading: boolean) => void;
  setBackdropLoadingText: (backdropLoadingText: string | React.ReactNode | undefined) => void;
};

/** 全局状态 */
export const useGlobalStore = create<GlobalState>((set) => ({
  backdropLoading: true,
  backdropLoadingText: undefined,
  setBackdropLoading: async (backdropLoading) => {
    set({ backdropLoading });
    if (!backdropLoading) {
      set({ backdropLoadingText: undefined });
    }
  },
  setBackdropLoadingText: async (backdropLoadingText) => {
    set({ backdropLoadingText });
  },
}));
