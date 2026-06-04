'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setSessionKind } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser, SessionResult, TwoFactorChallenge } from '@shared/types/auth';

/** Result of the first login step — either a session or a 2FA challenge. */
export type LoginResult = SessionResult | TwoFactorChallenge;

/** Narrow a login result to the 2FA-required branch. */
export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallenge {
  return 'requiresTwoFactor' in result;
}

/** Step 1: submit credentials. Returns a session or a 2FA challenge. */
export function useLogin() {
  return useMutation({
    mutationFn: (credentials: { identifier: string; password: string }) =>
      api.post<LoginResult>('/auth/login', credentials),
  });
}

/** Step 2: verify the 2FA code and establish the session. */
export function useVerifyOtp() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: { challengeId: string; otp: string }) =>
      api.post<SessionResult>('/auth/verify-otp', input),
    onSuccess: (data) => {
      setSessionKind('staff');
      setSession(data.user);
    },
  });
}

/** End the session and clear all cached queries. */
export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      setSessionKind(null);
      clearSession();
      queryClient.clear();
    },
  });
}

/** Fetch the signed-in staff member; used to rehydrate the session on load. */
export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.get<AuthUser>('/users/me'),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
