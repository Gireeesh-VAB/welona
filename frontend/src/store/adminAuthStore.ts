import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminAuthUser } from '@shared/types/auth';

/**
 * Client-side store for the admin (super-admin) session.
 *
 * Kept separate from `useAuthStore` so admin-side components never touch
 * the employee user object. Source of truth is still the httpOnly cookie pair
 * set by the API — this only mirrors the AdminAuthUser for instant first paint.
 */
type AdminAuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AdminAuthState {
  admin: AdminAuthUser | null;
  status: AdminAuthStatus;
  isAuthenticated: boolean;
  setAdminSession: (admin: AdminAuthUser) => void;
  clearAdminSession: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      status: 'unknown',
      isAuthenticated: false,
      setAdminSession: (admin) => set({ admin, status: 'authenticated', isAuthenticated: true }),
      clearAdminSession: () =>
        set({ admin: null, status: 'unauthenticated', isAuthenticated: false }),
    }),
    {
      name: 'welona-admin-auth',
      partialize: (state) => ({ admin: state.admin }),
    },
  ),
);
