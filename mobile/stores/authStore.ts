import { create } from 'zustand';
import {
  AuthUser,
  apiFetchMe,
  clearToken,
  getStoredToken,
  saveToken,
} from '../services/authService';
import { useBadgeStore } from './badgeStore';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isInitialized: boolean;
  setAuth: (user: AuthUser, token: string) => Promise<void>;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isInitialized: false,

  setAuth: async (user, token) => {
    await saveToken(token);
    set({ user, token });
  },

  updateUser: (user) => set({ user }),

  logout: async () => {
    await clearToken();
    useBadgeStore.getState().reset();
    set({ user: null, token: null });
  },

  initialize: async () => {
    const token = await getStoredToken();
    if (token) {
      try {
        const user = await apiFetchMe();
        set({ user, token, isInitialized: true });
      } catch {
        await clearToken();
        set({ user: null, token: null, isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },
}));
