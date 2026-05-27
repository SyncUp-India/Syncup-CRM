import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  dark: boolean;
  toggle: () => Promise<void>;
  init: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: false,
  toggle: async () => {
    const next = !get().dark;
    set({ dark: next });
    await AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  },
  init: async () => {
    const saved = await AsyncStorage.getItem('theme');
    set({ dark: saved === 'dark' });
  },
}));
