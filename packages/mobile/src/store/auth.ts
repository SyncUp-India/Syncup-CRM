import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@syncup/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: async (user, token) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isLoading: false });
  },
  clearAuth: async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    set({ user: null, token: null, isLoading: false });
  },
  hydrate: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet(['token', 'user']);
      const t = token[1];
      const u = userStr[1];
      if (t && u) {
        set({ user: JSON.parse(u), token: t, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
