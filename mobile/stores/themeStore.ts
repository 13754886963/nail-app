import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  initialize: () => Promise<void>;
}

const KEY = 'theme_mode';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',

  setMode: async (mode) => {
    await SecureStore.setItemAsync(KEY, mode);
    set({ mode });
  },

  initialize: async () => {
    const saved = await SecureStore.getItemAsync(KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      set({ mode: saved as ThemeMode });
    }
  },
}));
