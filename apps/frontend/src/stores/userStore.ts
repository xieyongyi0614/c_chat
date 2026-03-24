import { create } from 'zustand';
import { ipc } from '@c_chat/shared-utils';
import type { AuthTypes } from '@c_chat/shared-types';

type UserState = {
  userInfo: AuthTypes.GetUserInfoResponse | null;
  setUserInfo: (userInfo: AuthTypes.GetUserInfoResponse | null) => void;
  isSignedIn: () => boolean;
  autoSignIn: () => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  refreshUserInfo: () => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  logout: () => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  isSignedIn: () => !!get().userInfo?.id,

  autoSignIn: async () => {
    const userInfo = await ipc.AutoSignIn();
    userInfo && set({ userInfo });
    return userInfo;
  },

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
