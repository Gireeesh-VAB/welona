'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setSessionKind } from '@/lib/api-client';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import type { AdminAuthUser, AdminSessionResult } from '@shared/types/auth';

/** Submit admin credentials and establish the session. */
export function useAdminLogin() {
  const setAdminSession = useAdminAuthStore((s) => s.setAdminSession);
  return useMutation({
    mutationFn: (credentials: { identifier: string; password: string }) =>
      api.post<AdminSessionResult>('/auth/admin/login', credentials),
    onSuccess: (data) => {
      setSessionKind('admin');
      setAdminSession(data.user);
    },
  });
}

/** End the admin session and clear all cached queries. */
export function useAdminLogout() {
  const clearAdminSession = useAdminAuthStore((s) => s.clearAdminSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/admin/logout'),
    onSettled: () => {
      setSessionKind(null);
      clearAdminSession();
      queryClient.clear();
    },
  });
}

/** Fetch the signed-in admin user; used to rehydrate the session on load. */
export function useCurrentAdmin(enabled = true) {
  return useQuery({
    queryKey: ['currentAdmin'],
    queryFn: () => api.get<AdminAuthUser>('/auth/admin/me'),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
