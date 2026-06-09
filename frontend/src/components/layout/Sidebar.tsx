'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Drawer, Layout, Menu } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BankOutlined,
  BellOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CopyOutlined,
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
  QuestionCircleOutlined,
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
  'reports-main': <FileTextOutlined />,
  analytics: <BarChartOutlined />,
  notifications: <BellOutlined />,
  settings: <SettingOutlined />,
  enquiry: <QuestionCircleOutlined />,
  'duplicate-receipt': <CopyOutlined />,
  'bank-deposit': <BankOutlined />,
  'admin-assigned': <AuditOutlined />,
};

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useBrandColors();

  const activeKey =
    [...navigation]
      .filter((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)))
      .sort((a, b) => b.path.length - a.path.length)[0]?.key ?? 'dashboard';

  const buildMenuItems = (items: typeof navigation): ItemType[] =>
    items.map((item) => {
      const baseItem = { key: item.key, icon: icons[item.key], label: item.label };
      if (item.children && item.children.length > 0) {
        return { ...baseItem, children: buildMenuItems(item.children) };
      }
      return baseItem;
    });

  const menuItems = getGroupedNavigation().map(({ group, items }) => ({
    type: 'group' as const,
    key: group.key,
    label: group.label,
    children: buildMenuItems(items),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
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
            lineHeight: 1.1,
          }}
        >
          {collapsed ? 'V' : 'WELONA'}
        </span>
        {!collapsed && (
          <span
            style={{
              color: colors.text.placeholder,
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: 3,
              marginTop: 2,
            }}
          >
            BRANCH PORTAL
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 48 }}>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={({ key }) => {
            const findItem = (items: typeof navigation): (typeof navigation)[0] | undefined => {
              for (const item of items) {
                if (item.key === key) return item;
                if (item.children) {
                  const found = findItem(item.children);
                  if (found) return found;
                }
              }
              return undefined;
            };
            const target = findItem(navigation);
            if (target) {
              router.push(target.path);
              onNavigate?.();
            }
          }}
          items={menuItems}
        />
      </div>
    </div>
  );
}

export default function Sidebar({
  collapsed,
  onCollapse,
  isMobile = false,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const colors = useBrandColors();

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={onMobileClose}
        width={240}
        styles={{
          body: { padding: 0, background: colors.black.secondary },
          header: { display: 'none' },
          wrapper: { boxShadow: '4px 0 12px rgba(0,0,0,0.15)' },
        }}
        style={{ zIndex: 1001 }}
      >
        <SidebarMenu collapsed={false} onNavigate={onMobileClose} />
      </Drawer>
    );
  }

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
      <SidebarMenu collapsed={collapsed} />
    </Sider>
  );
}
