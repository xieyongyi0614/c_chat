import { create } from 'zustand';
import { ipc } from '@c_chat/shared-utils';
import type { AuthTypes } from '@c_chat/shared-types';

type UserState = {
  userInfo: AuthTypes.GetUserInfoResponse | null;
  setUserInfo: (userInfo: AuthTypes.GetUserInfoResponse | null) => void;
  updateUserProfile: (
    params: AuthTypes.UpdateUserProfileParams,
  ) => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  isSignedIn: () => boolean;
  refreshUserInfo: () => Promise<AuthTypes.GetUserInfoResponse | undefined>;
  logout: () => Promise<void>;
};

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  isSignedIn: () => !!get().userInfo?.id,

  setUserInfo: (userInfo) => {
    set({ userInfo });
  },

  updateUserProfile: async (params) => {
    const userInfo = await ipc.UpdateUserProfile(params);
    if (userInfo) {
      set({ userInfo });
    }
    return userInfo;
  },

  refreshUserInfo: async () => {
    const res = await ipc.GetUserInfo();
    return res;
  },

  logout: async () => {
    try {
      await ipc.Logout();
    } finally {
      set({ userInfo: null });
    }
  },
}));
