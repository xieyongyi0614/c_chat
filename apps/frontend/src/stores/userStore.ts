import { create } from 'zustand';
import { ipc } from '@c_chat/shared-utils';
import type { AuthTypes } from '@c_chat/shared-types';

type UserState = {
  userInfo: AuthTypes.GetUserInfoResponse | null;
  setUserInfo: (userInfo: AuthTypes.GetUserInfoResponse | null) => void;
  isSignedIn: () => boolean;
  refreshUserInfo: () => Promise<AuthTypes.GetUserInfoResponse>;
  logout: () => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  isSignedIn: () => !!get().userInfo?.id,

  setUserInfo: async (userInfo) => {
    set({ userInfo });
  },

  refreshUserInfo: async () => {
    const res = await ipc.GetUserInfo();
    return res;
  },

  logout: () => {
    set({ userInfo: null });
  },
}));
