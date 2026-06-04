import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BranchAuthUser } from '@shared/types/auth';

/**
 * Client-side store for the branch (SystemUser) session.
 *
 * Kept separate from the admin / staff stores so branch-scoped components
 * never touch the other user objects. Source of truth is still the httpOnly
 * cookie pair set by the API — this only mirrors the BranchAuthUser for
 * instant first paint.
 */
type BranchAuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface BranchAuthState {
  branch: BranchAuthUser | null;
  status: BranchAuthStatus;
  isAuthenticated: boolean;
  setBranchSession: (branch: BranchAuthUser) => void;
  clearBranchSession: () => void;
}

export const useBranchAuthStore = create<BranchAuthState>()(
  persist(
    (set) => ({
      branch: null,
      status: 'unknown',
      isAuthenticated: false,
      setBranchSession: (branch) =>
        set({ branch, status: 'authenticated', isAuthenticated: true }),
      clearBranchSession: () =>
        set({ branch: null, status: 'unauthenticated', isAuthenticated: false }),
    }),
    {
      name: 'welona-branch-auth',
      partialize: (state) => ({ branch: state.branch }),
    },
  ),
);
