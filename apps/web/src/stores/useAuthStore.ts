/**
 * Zustand Auth Store
 * Manages authentication state and user data
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

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
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const response = await apiClient.post<{ user: User; token: string }>(
      '/api/auth/login',
      { email, password }
    );

    if (response.error) {
      set({ isLoading: false, error: response.error.message });
      return false;
    }

    if (response.data) {
      apiClient.setToken(response.data.token);
      set({ user: response.data.user, isLoading: false, error: null });
      return true;
    }

    return false;
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });

    const response = await apiClient.post<{ user: User; token: string }>(
      '/api/auth/register',
      { email, password, displayName }
    );

    if (response.error) {
      set({ isLoading: false, error: response.error.message });
      return false;
    }

    if (response.data) {
      apiClient.setToken(response.data.token);
      set({ user: response.data.user, isLoading: false, error: null });
      return true;
    }

    return false;
  },

  logout: () => {
    apiClient.setToken(null);
    set({ user: null, error: null });
  },

  checkAuth: async () => {
    const token = apiClient.getToken();
    if (!token) {
      set({ user: null });
      return;
    }

    set({ isLoading: true });

    const response = await apiClient.get<{ user: User }>('/api/auth/me');

    if (response.error) {
      apiClient.setToken(null);
      set({ user: null, isLoading: false });
      return;
    }

    if (response.data) {
      set({ user: response.data.user, isLoading: false });
    }
  },
}));
