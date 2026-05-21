'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  GiftOutlined,
  IdcardOutlined,
  LockOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  SnippetsOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { navigation, getGroupedNavigation } from '@/config/navigation';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Sider } = Layout;

/** Icon per navigation key. */
const icons: Record<string, ReactNode> = {
  dashboard: <DashboardOutlined />,
  sales: <FundProjectionScreenOutlined />,
  bookings: <CalendarOutlined />,
  services: <AppstoreOutlined />,
  products: <ShoppingOutlined />,
  inventory: <DatabaseOutlined />,
  customers: <TeamOutlined />,
  staff: <IdcardOutlined />,
  branches: <ShopOutlined />,
  finance: <DollarOutlined />,
  'pending-payments': <CreditCardOutlined />,
  'cash-denomination': <CalculatorOutlined />,
  'petty-cash': <WalletOutlined />,
  'voucher-entry': <SnippetsOutlined />,
  'day-close': <LockOutlined />,
  promotions: <GiftOutlined />,
  support: <CustomerServiceOutlined />,
  reports: <FileTextOutlined />,
  analytics: <BarChartOutlined />,
  notifications: <BellOutlined />,
  settings: <SettingOutlined />,
};

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useBrandColors();

  // Longest matching path wins so e.g. /sales/leads/123 keeps "sales" active.
  const activeKey =
    [...navigation]
      .filter((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)))
      .sort((a, b) => b.path.length - a.path.length)[0]?.key ?? 'dashboard';

  // Group headers + their module items.
  const menuItems = getGroupedNavigation().map(({ group, items }) => ({
    type: 'group' as const,
    key: group.key,
    label: group.label,
    children: items.map((item) => ({
      key: item.key,
      icon: icons[item.key],
      label: item.label,
    })),
  }));

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      theme="light"
      style={{
        borderRight: `1px solid ${colors.border}`,
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span
            style={{
              color: colors.gold.primary,
              fontWeight: 700,
              fontSize: collapsed ? 16 : 20,
              letterSpacing: collapsed ? 1 : 4,
            }}
          >
            {collapsed ? 'V' : 'WELONA'}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 48 }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeKey]}
            onClick={({ key }) => {
              const target = navigation.find((item) => item.key === key);
              if (target) router.push(target.path);
            }}
            items={menuItems}
          />
        </div>
      </div>
    </Sider>
  );
}
