import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@shared/types/auth';

/**
 * Client-side auth store.
 *
 * The session's source of truth is the httpOnly cookie pair set by the API
 * (sections 7.1–7.3); this store only mirrors the signed-in `AuthUser` so the
 * UI can render immediately and gate controls by permission. It is rehydrated
 * from `GET /api/v1/users/me` on every app load.
 */
export type { AuthUser };

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  /** `unknown` until the first /users/me check resolves. */
  status: AuthStatus;
  isAuthenticated: boolean;
  /** Record a signed-in user (after login or rehydration). */
  setSession: (user: AuthUser) => void;
  /** Clear the session (logout, or a failed rehydration). */
  clearSession: () => void;
  /** Permission check following the `module:action` pattern. */
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      status: 'unknown',
      isAuthenticated: false,
      setSession: (user) => set({ user, status: 'authenticated', isAuthenticated: true }),
      clearSession: () => set({ user: null, status: 'unauthenticated', isAuthenticated: false }),
      hasPermission: (permission) => {
        const perms = get().user?.permissions ?? [];
        return perms.includes('*') || perms.includes(permission);
      },
    }),
    {
      name: 'welona-auth',
      // Persist only the user for an instant first paint; `status` is always
      // re-derived from the server on load.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
