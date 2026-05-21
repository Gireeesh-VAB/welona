'use client';

import { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/auth/AuthGuard';

const { Content } = Layout;

/**
 * Dashboard layout group — Sidebar + Header + Breadcrumb shell.
 * Wrapped in AuthGuard so every dashboard route has a verified session.
 * Source: Developer Reference Architecture v2.0, section 4.4.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout>
          <Header />
          <Content style={{ padding: 24, overflow: 'auto' }}>{children}</Content>
        </Layout>
      </Layout>
    </AuthGuard>
  );
}
