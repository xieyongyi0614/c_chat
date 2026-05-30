import { create } from 'zustand';
import type { AuthTypes } from '@c_chat/shared-types';

interface UserState {
  userInfo: AuthTypes.GetUserInfoResponse | null;
  isAuthenticated: boolean;
  setUserInfo: (userInfo: AuthTypes.GetUserInfoResponse | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  userInfo: null,
  isAuthenticated: false,
  setUserInfo: (userInfo) => set({ userInfo, isAuthenticated: !!userInfo }),
  clearUser: () => set({ userInfo: null, isAuthenticated: false }),
}));
