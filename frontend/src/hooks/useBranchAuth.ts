'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setSessionKind } from '@/lib/api-client';
import { useBranchAuthStore } from '@/store/branchAuthStore';
import type { BranchAuthUser, BranchSessionResult } from '@shared/types/auth';

/** Submit branch credentials and establish the session. */
export function useBranchLogin() {
  const setBranchSession = useBranchAuthStore((s) => s.setBranchSession);
  return useMutation({
    mutationFn: (credentials: { identifier: string; password: string }) =>
      api.post<BranchSessionResult>('/auth/branch/login', credentials),
    onSuccess: (data) => {
      setSessionKind('branch');
      setBranchSession(data.user);
    },
  });
}

/** End the branch session and clear all cached queries. */
export function useBranchLogout() {
  const clearBranchSession = useBranchAuthStore((s) => s.clearBranchSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/branch/logout'),
    onSettled: () => {
      setSessionKind(null);
      clearBranchSession();
      queryClient.clear();
    },
  });
}

/** Fetch the signed-in branch user; used to rehydrate the session on load. */
export function useCurrentBranch(enabled = true) {
  return useQuery({
    queryKey: ['currentBranch'],
    queryFn: () => api.get<BranchAuthUser>('/auth/branch/me'),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
