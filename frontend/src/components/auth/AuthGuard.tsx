'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useCurrentUser } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { ACCESS_COOKIE } from '@shared/auth-constants';
import { colors } from '@/theme/colors';

/**
 * Verifies the session for the dashboard layout group.
 *
 * Calls `GET /api/v1/users/me` on mount: on success the store is rehydrated,
 * on failure the user is sent to /login. `middleware.ts` is the first-line
 * guard (cookie presence); this is the authoritative check.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (data) setSession(data);
  }, [data, setSession]);

  useEffect(() => {
    if (isError) {
      // The access cookie may be present but invalid (e.g. a stale token from
      // a previous build). Clear it so `middleware.ts` — which only checks
      // cookie presence — stops redirecting us back here in a loop.
      document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0`;
      clearSession();
      router.replace('/login');
    }
  }, [isError, clearSession, router]);

  // Block first paint only when there is no persisted user to show.
  if ((isLoading && !user) || isError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.black.primary,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
