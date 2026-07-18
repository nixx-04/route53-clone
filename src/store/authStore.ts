import { create } from 'zustand';
import { api, getStoredToken } from '../lib/api';
import { User, AuthState } from '../types';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  loading: true, // Start in loading state until session checked
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.auth.login({ email, password });
      set({
        isAuthenticated: true,
        user: response.user,
        loading: false,
      });
      return response.user;
    } catch (err: any) {
      const errorMsg = err.message || 'Login failed';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout API call failed, clearing local state anyway:', err);
    } finally {
      set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
    }
  },

  checkSession: async () => {
    const localToken = getStoredToken();
    if (!localToken) {
      set({ isAuthenticated: false, user: null, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const user = await api.auth.me();
      set({
        isAuthenticated: true,
        user,
        loading: false,
      });
    } catch (err) {
      // Token is invalid or expired, clear local state silently
      console.warn('Session check failed, clearing token:', err);
      set({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
