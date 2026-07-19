import { create } from 'zustand';
import { User } from '@/types';

interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Invalid email or password');
      }

      const data = await res.json();
      set({
        isAuthenticated: true,
        user: data.user,
        loading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: err.message || 'Login failed',
      });
      return false;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
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
    set({ loading: true });
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const user = await res.json();
        set({
          isAuthenticated: true,
          user,
          loading: false,
          error: null,
        });
      } else {
        set({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
    }
  },
}));
