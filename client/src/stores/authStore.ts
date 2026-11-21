import { create } from 'zustand';
import {
  apiClient,
  setAccessToken,
  registerSessionRefreshListener,
} from '@/lib/api';
import { UserProfile, UserRole } from '@/types/auth';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'student' | 'instructor';
  headline?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  setSession: (user: UserProfile, accessToken: string) => void;
  clearSession: () => void;
  initializeAuth: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  becomeInstructor: () => Promise<UserProfile>;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  registerSessionRefreshListener((newToken) => {
    if (!newToken) {
      set({ user: null, accessToken: null });
    } else {
      set({ accessToken: newToken });
    }
  });

  return {
    user: null,
    accessToken: null,
    isInitialized: false,
    isLoading: false,

    setSession: (user, accessToken) => {
      setAccessToken(accessToken);
      set({ user, accessToken, isInitialized: true });
    },

    clearSession: () => {
      setAccessToken(null);
      set({ user: null, accessToken: null, isInitialized: true });
    },

    initializeAuth: async () => {
      if (get().isInitialized) return;
      set({ isLoading: true });
      try {
        const res = await apiClient.post('/auth/refresh');
        const { user, accessToken } = res.data.data;
        setAccessToken(accessToken);
        set({ user, accessToken, isInitialized: true, isLoading: false });
      } catch {
        setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isInitialized: true,
          isLoading: false,
        });
      }
    },

    login: async (payload) => {
      set({ isLoading: true });
      try {
        const res = await apiClient.post('/auth/login', payload);
        const { user, accessToken } = res.data.data;
        setAccessToken(accessToken);
        set({ user, accessToken, isLoading: false, isInitialized: true });
        return user;
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    register: async (payload) => {
      set({ isLoading: true });
      try {
        const res = await apiClient.post('/auth/register', payload);
        const { user, accessToken } = res.data.data;
        setAccessToken(accessToken);
        set({ user, accessToken, isLoading: false, isInitialized: true });
        return user;
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        await apiClient.post('/auth/logout');
      } finally {
        setAccessToken(null);
        set({ user: null, accessToken: null });
      }
    },

    updateProfile: async (payload) => {
      const res = await apiClient.patch('/users/profile', payload);
      const { user } = res.data.data;
      set({ user });
      return user;
    },

    becomeInstructor: async () => {
      const res = await apiClient.post('/users/become-instructor');
      const { user, accessToken } = res.data.data;
      setAccessToken(accessToken);
      set({ user, accessToken });
      return user;
    },

    hasRole: (...roles) => {
      const currentUser = get().user;
      if (!currentUser) return false;
      return roles.includes(currentUser.role);
    },
  };
});
