'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { useCurrentAdmin } from '@/hooks/useAdminAuth';
import { useCurrentBranch } from '@/hooks/useBranchAuth';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useBranchAuthStore } from '@/store/branchAuthStore';
import { getSessionKind } from '@/lib/api-client';
import { ACCESS_COOKIE } from '@shared/auth-constants';
import { colors } from '@/theme/colors';

/**
 * Guards the /admin layout for BOTH session pools that use this panel:
 *
 *  • admin (super-admin) sessions  → verified via GET /auth/admin/me
 *  • branch (SystemUser) sessions  → verified via GET /auth/branch/me
 *
 * The active pool is read from the persisted session kind. The matching
 * `me` query runs; the other is disabled. A failed verification clears the
 * mirror state and routes to the correct login page.
 */
export default function PanelAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Read once on mount so a mid-session change can't flip which query runs.
  const [isBranch] = useState(() => getSessionKind() === 'branch');

  // Branch sessions are confined to the branch-scoped modules (mirror of
  // `BRANCH_NAV_KEYS` in AdminSidebar: dashboard, inventory, customers, sales,
  // hr, report). Any other /admin/* route (master data, admin console, cash,
  // change-paymode, settings…) bounces back to the branch dashboard.
  useEffect(() => {
    if (!isBranch) return;
    const allowed =
      pathname === '/admin' ||
      ['/admin/inventory', '/admin/customers', '/admin/sales', '/admin/hr', '/admin/report'].some(
        (prefix) => pathname.startsWith(prefix),
      );
    if (!allowed) router.replace('/admin');
  }, [isBranch, pathname, router]);

  const adminQuery = useCurrentAdmin(!isBranch);
  const branchQuery = useCurrentBranch(isBranch);

  const admin = useAdminAuthStore((s) => s.admin);
  const setAdminSession = useAdminAuthStore((s) => s.setAdminSession);
  const clearAdminSession = useAdminAuthStore((s) => s.clearAdminSession);
  const branch = useBranchAuthStore((s) => s.branch);
  const setBranchSession = useBranchAuthStore((s) => s.setBranchSession);
  const clearBranchSession = useBranchAuthStore((s) => s.clearBranchSession);

  const { data, isLoading, isError } = isBranch ? branchQuery : adminQuery;
  const mirror = isBranch ? branch : admin;

  useEffect(() => {
    if (!data) return;
    if (isBranch) setBranchSession(data as never);
    else setAdminSession(data as never);
  }, [data, isBranch, setAdminSession, setBranchSession]);

  useEffect(() => {
    if (!isError) return;
    document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0`;
    if (isBranch) {
      clearBranchSession();
      router.replace('/admin/branch-login');
    } else {
      clearAdminSession();
      router.replace('/admin/login');
    }
  }, [isError, isBranch, clearAdminSession, clearBranchSession, router]);

  if ((isLoading && !mirror) || isError) {
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
