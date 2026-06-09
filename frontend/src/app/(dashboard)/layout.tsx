'use client';

import { useEffect, useState } from 'react';
import { Layout } from 'antd';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/auth/AuthGuard';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <AuthGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <Layout>
          <Header onMobileMenuClick={() => setMobileOpen(true)} isMobile={isMobile} />
          <Content style={{ padding: isMobile ? 12 : 24, overflow: 'auto' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </AuthGuard>
  );
}
