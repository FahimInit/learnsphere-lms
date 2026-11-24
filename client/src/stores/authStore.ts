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

const SESSION_HINT_KEY = 'learnsphere_has_session';
const AUTH_CHANNEL_NAME = 'learnsphere_auth_sync';

type AuthSyncMessage = {
  type: 'LOGOUT' | 'LOGIN';
};

let authChannel: BroadcastChannel | null = null;

function getAuthBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!authChannel) {
    try {
      authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    } catch {
      authChannel = null;
    }
  }
  return authChannel;
}

function broadcastAuthEvent(message: AuthSyncMessage): void {
  try {
    getAuthBroadcastChannel()?.postMessage(message);
  } catch {
    // ignore BroadcastChannel errors in restricted contexts
  }
}

function hasSessionHint(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionHint(active: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    if (active) {
      window.localStorage.setItem(SESSION_HINT_KEY, '1');
    } else {
      window.localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {
    // ignore storage access errors in restricted environments
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const applyRemoteLogout = () => {
    setSessionHint(false);
    setAccessToken(null);
    set({ user: null, accessToken: null, isInitialized: true, isLoading: false });
  };

  const applyRemoteLogin = async () => {
    if (get().user || get().isLoading) return;
    try {
      const res = await apiClient.post('/auth/refresh');
      const { user, accessToken } = res.data.data;
      setSessionHint(true);
      setAccessToken(accessToken);
      set({ user, accessToken, isInitialized: true, isLoading: false });
    } catch {
      // ignore if session cookie is not active
    }
  };

  const channel = getAuthBroadcastChannel();
  if (channel) {
    channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      if (event.data?.type === 'LOGOUT') {
        applyRemoteLogout();
      } else if (event.data?.type === 'LOGIN') {
        void applyRemoteLogin();
      }
    };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== SESSION_HINT_KEY) return;
      if (event.newValue !== '1') {
        applyRemoteLogout();
      } else if (event.newValue === '1') {
        void applyRemoteLogin();
      }
    });
  }

  registerSessionRefreshListener((newToken) => {
    if (!newToken) {
      setSessionHint(false);
      set({ user: null, accessToken: null });
      broadcastAuthEvent({ type: 'LOGOUT' });
    } else {
      setSessionHint(true);
      set({ accessToken: newToken });
    }
  });

  return {
    user: null,
    accessToken: null,
    isInitialized: false,
    isLoading: false,

    setSession: (user, accessToken) => {
      setSessionHint(true);
      setAccessToken(accessToken);
      set({ user, accessToken, isInitialized: true });
      broadcastAuthEvent({ type: 'LOGIN' });
    },

    clearSession: () => {
      setSessionHint(false);
      setAccessToken(null);
      set({ user: null, accessToken: null, isInitialized: true });
      broadcastAuthEvent({ type: 'LOGOUT' });
    },

    initializeAuth: async () => {
      if (get().isInitialized) return;
      if (!hasSessionHint()) {
        set({ user: null, accessToken: null, isInitialized: true, isLoading: false });
        return;
      }
      set({ isLoading: true });
      try {
        const res = await apiClient.post('/auth/refresh');
        const { user, accessToken } = res.data.data;
        setSessionHint(true);
        setAccessToken(accessToken);
        set({ user, accessToken, isInitialized: true, isLoading: false });
      } catch {
        setSessionHint(false);
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
        setSessionHint(true);
        setAccessToken(accessToken);
        set({ user, accessToken, isLoading: false, isInitialized: true });
        broadcastAuthEvent({ type: 'LOGIN' });
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
        setSessionHint(true);
        setAccessToken(accessToken);
        set({ user, accessToken, isLoading: false, isInitialized: true });
        broadcastAuthEvent({ type: 'LOGIN' });
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
        setSessionHint(false);
        setAccessToken(null);
        set({ user: null, accessToken: null });
        broadcastAuthEvent({ type: 'LOGOUT' });
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
