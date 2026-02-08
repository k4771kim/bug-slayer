/**
 * Zustand Auth Store
 * Manages authentication state and user data
 */

import { create } from 'zustand';
import { apiPost, apiGet } from '@/lib/apiClient';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const data = await apiPost<{ user: User }>(
        '/api/auth/login',
        { email, password }
      );

      set({ user: data.user, isLoading: false, error: null });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });

    try {
      const data = await apiPost<{ user: User }>(
        '/api/auth/register',
        { email, password, displayName }
      );

      set({ user: data.user, isLoading: false, error: null });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      // Call server to clear httpOnly cookie
      await apiPost('/api/auth/logout');
    } catch (error) {
      // Ignore errors on logout
      console.error('Logout error:', error);
    }
    set({ user: null, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });

    try {
      const data = await apiGet<{ user: User }>('/api/auth/me');
      set({ user: data.user, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },
}));
