'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Layout } from 'antd';
import AdminSidebar from '@/components/layout/AdminSidebar';
import Header from '@/components/layout/Header';
import PanelAuthGuard from '@/components/auth/PanelAuthGuard';

const { Content } = Layout;

/**
 * Admin route group — separate side from the employee /dashboard layout.
 * The login pages (/admin/login for super-admins, /admin/branch-login for
 * branch users) are rendered bare so the guard never wraps them (which would
 * loop). Every other /admin/* route is gated by PanelAuthGuard, which accepts
 * both the admin and branch session pools.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === '/admin/login' || pathname === '/admin/branch-login') {
    return <>{children}</>;
  }

  return (
    <PanelAuthGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <AdminSidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout>
          <Header />
          <Content style={{ padding: 24, overflow: 'auto' }}>{children}</Content>
        </Layout>
      </Layout>
    </PanelAuthGuard>
  );
}
