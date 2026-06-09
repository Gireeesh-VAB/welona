'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Layout } from 'antd';
import AdminSidebar from '@/components/layout/AdminSidebar';
import Header from '@/components/layout/Header';
import PanelAuthGuard from '@/components/auth/PanelAuthGuard';

const { Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <PanelAuthGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <AdminSidebar
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
    </PanelAuthGuard>
  );
}
