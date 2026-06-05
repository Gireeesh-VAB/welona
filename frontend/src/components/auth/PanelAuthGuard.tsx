'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useCurrentAdmin } from '@/hooks/useAdminAuth';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { ACCESS_COOKIE } from '@shared/auth-constants';
import { colors } from '@/theme/colors';

/**
 * Guards every /admin/* route (except /admin/login). Verifies the admin
 * session via GET /auth/admin/me; redirects to /admin/login on failure.
 */
export default function PanelAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentAdmin();
  const admin = useAdminAuthStore((s) => s.admin);
  const setAdminSession = useAdminAuthStore((s) => s.setAdminSession);
  const clearAdminSession = useAdminAuthStore((s) => s.clearAdminSession);

  useEffect(() => {
    if (data) setAdminSession(data);
  }, [data, setAdminSession]);

  useEffect(() => {
    if (!isError) return;
    document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0`;
    clearAdminSession();
    router.replace('/admin/login');
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
