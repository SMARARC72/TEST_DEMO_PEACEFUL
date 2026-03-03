// ─── Auth Store ──────────────────────────────────────────────────────
// Zustand store that owns auth state + wires token accessors into the
// api client to avoid circular dependencies.
// Supports dual-mode: Auth0 Universal Login (production) + local JWT (dev/test).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { bindTokenAccessors } from '@/api/client';
import { authApi } from '@/api/auth';
import type { User, UserRole } from '@/api/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Whether the current session is via Auth0 (affects logout behavior) */
  isAuth0Session: boolean;

  // actions
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; userId?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'PATIENT' | 'CLINICIAN';
  }) => Promise<void>;
  mfaVerify: (userId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
  /** Called after Auth0 callback to set session from Auth0 tokens */
  setAuth0Session: (accessToken: string, user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAuth0Session: false,

      setTokens: (access, refresh) => {
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isAuth0Session: false,
        });
      },

      setAuth0Session: (accessToken, user) => {
        set({
          user,
          accessToken,
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          isAuth0Session: true,
        });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        const [data, err] = await authApi.login(email, password);
        if (err) {
          set({ isLoading: false, error: err.message });
          throw new Error(err.message);
        }

        // MFA required?
        if (data && 'mfaRequired' in data && data.mfaRequired) {
          set({ isLoading: false });
          return { mfaRequired: true, userId: data.userId };
        }

        const loginData = data as { accessToken: string; refreshToken: string; user: User };
        set({
          user: loginData.user,
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return {};
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        const [res, err] = await authApi.register(data);
        if (err) {
          set({ isLoading: false, error: err.message });
          throw new Error(err.message);
        }
        if (res?.accessToken && res?.user) {
          set({
            user: res.user,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken ?? null,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      },

      mfaVerify: async (userId, code) => {
        set({ isLoading: true, error: null });
        const [data, err] = await authApi.mfaVerify(userId, code);
        if (err) {
          set({ isLoading: false, error: err.message });
          throw new Error(err.message);
        }
        if (data) {
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        await authApi.logout(refreshToken ?? undefined);
        get().clearAuth();
      },

      fetchMe: async () => {
        const [data, err] = await authApi.getMe();
        if (err) {
          if (err.status === 401) get().clearAuth();
          return;
        }
        if (data) set({ user: data });
      },
    }),
    {
      name: 'peacefull-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAuth0Session: state.isAuth0Session,
      }),
    },
  ),
);

// ─── Wire tokens into api client (runs once on import) ──────────────
bindTokenAccessors({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
  clearAuth: () => useAuthStore.getState().clearAuth(),
});

// ─── Role helper ────────────────────────────────────────────────────
export function useRole(): UserRole | null {
  return useAuthStore((s) => s.user?.role ?? null);
}
