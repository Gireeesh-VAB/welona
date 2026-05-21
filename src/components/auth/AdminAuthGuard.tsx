'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useCurrentAdmin } from '@/hooks/useAdminAuth';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { ACCESS_COOKIE } from '@/lib/auth/constants';
import { colors } from '@/theme/colors';

/**
 * Guards the /admin layout — verifies the current session is admin-typed.
 *
 * Calls `GET /api/v1/auth/admin/me` on mount: staff sessions are rejected by
 * the server (`requireAdminAuth` throws 401) and the user is sent to
 * /admin/login. Mirrors AuthGuard but for the admin session pool.
 */
export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentAdmin();
  const admin = useAdminAuthStore((s) => s.admin);
  const setAdminSession = useAdminAuthStore((s) => s.setAdminSession);
  const clearAdminSession = useAdminAuthStore((s) => s.clearAdminSession);

  useEffect(() => {
    if (data) setAdminSession(data);
  }, [data, setAdminSession]);

  useEffect(() => {
    if (isError) {
      document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0`;
      clearAdminSession();
      router.replace('/admin/login');
    }
  }, [isError, clearAdminSession, router]);

  if ((isLoading && !admin) || isError) {
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
