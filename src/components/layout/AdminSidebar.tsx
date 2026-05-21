'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu } from 'antd';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  GiftOutlined,
  IdcardOutlined,
  MessageOutlined,
  PercentageOutlined,
  PhoneOutlined,
  PictureOutlined,
  RightOutlined,
  ScheduleOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  SnippetsOutlined,
  SolutionOutlined,
  SwapOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import type { ReactNode } from 'react';
import {
  adminNavigation,
  getAdminNavItem,
  getAdminNavItemByPath,
  type AdminNavItem,
} from '@/config/adminNavigation';
import { useBrandColors } from '@/hooks/useBrandColors';
import type { colors as colorsType } from '@/theme/colors';

/**
 * Walk the nav tree and return the ancestor chain of `targetKey` (excluding
 * the key itself). Used for accordion behaviour — opening a submenu auto-
 * closes its siblings by reconstructing the open-keys list from this chain.
 */
function findAncestorKeys(
  targetKey: string,
  items: AdminNavItem[] = adminNavigation,
  trail: string[] = [],
): string[] | null {
  for (const item of items) {
    if (item.key === targetKey) return trail;
    if (item.children) {
      const found = findAncestorKeys(targetKey, item.children, [...trail, item.key]);
      if (found) return found;
    }
  }
  return null;
}

const { Sider } = Layout;

/** Icon per admin navigation key (top-level + Master children). */
const icons: Record<string, ReactNode> = {
  dashboard: <DashboardOutlined />,
  master: <DatabaseOutlined />,
  hr: <TeamOutlined />,
  cancellation: <CloseCircleOutlined />,
  report: <FileTextOutlined />,
  admin: <SafetyOutlined />,
  'change-paymode': <SwapOutlined />,
  settings: <SettingOutlined />,
  // Master sub-items
  'master-zone': <EnvironmentOutlined />,
  'master-branches': <ShopOutlined />,
  'master-services': <AppstoreOutlined />,
  'master-ledgers': <BankOutlined />,
  'master-payment-mode': <WalletOutlined />,
  'master-tax': <PercentageOutlined />,
  'master-media': <PictureOutlined />,
  'master-role': <IdcardOutlined />,
  'master-create-offer': <GiftOutlined />,
  'master-category': <TagsOutlined />,
  // HR sub-items
  'hr-designations': <SolutionOutlined />,
  'hr-departments': <ApartmentOutlined />,
  'hr-employee': <TeamOutlined />,
  'hr-user': <UserOutlined />,
  // Cancellation sub-items
  'cancellation-customers': <TeamOutlined />,
  'cancellation-package': <CloseCircleOutlined />,
  'cancellation-receipt': <FileTextOutlined />,
  'cancellation-voucher': <SnippetsOutlined />,
  // Admin sub-items
  'admin-sms': <MessageOutlined />,
  'admin-scheduler': <ScheduleOutlined />,
  'admin-appointments': <CalendarOutlined />,
  // Branch Report group categories
  'report-sales': <FundProjectionScreenOutlined />,
  'report-services': <AppstoreOutlined />,
  'report-calls-media': <PhoneOutlined />,
  'report-cash': <WalletOutlined />,
  'report-incentives': <GiftOutlined />,
};

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

function toMenuItem(
  item: AdminNavItem,
  onTitleClick: (key: string) => void,
  colors: typeof colorsType,
): ItemType {
  const rawIcon = icons[item.key] ?? <ApartmentOutlined />;
  // Wrap the icon so it stays visible in submenu titles where Ant Design's
  // default token sometimes washes the colour out against the light theme.
  const icon = (
    <span style={{ color: colors.text.primary, fontSize: 15, display: 'inline-flex' }}>
      {rawIcon}
    </span>
  );
  if (item.children && item.children.length > 0) {
    return {
      key: item.key,
      icon,
      label: <span style={{ color: colors.text.primary, fontWeight: 600 }}>{item.label}</span>,
      // Clicking the parent header navigates to its hub page (e.g.
      // /admin/master). The expand arrow on the right still toggles the
      // submenu open/closed independently.
      onTitleClick: ({ key }) => onTitleClick(String(key)),
      children: item.children.map((c) => toMenuItem(c, onTitleClick, colors)),
    };
  }
  return {
    key: item.key,
    icon,
    label: <span style={{ color: colors.text.primary }}>{item.label}</span>,
  };
}

export default function AdminSidebar({ collapsed, onCollapse }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useBrandColors();

  const activeItem = getAdminNavItemByPath(pathname);
  const activeKey = activeItem?.key ?? 'dashboard';

  // Compute the open-keys set for a given active key: every ancestor of the
  // key, plus the key itself if it's a parent (has children). The "+ self if
  // parent" piece is what stops parents from snapping closed the instant the
  // user clicks them — without it, navigating to /admin/hr (a parent route)
  // would set openKeys to [] because HR has no ancestors.
  const computeOpenKeysFor = (key: string): string[] => {
    const ancestors = findAncestorKeys(key) ?? [];
    const item = getAdminNavItem(key);
    const hasChildren = (item?.children?.length ?? 0) > 0;
    return hasChildren ? [...ancestors, key] : ancestors;
  };

  // Controlled open keys — start with the active route's open chain so deep
  // links land with the right submenu already expanded.
  const initialOpen = useMemo(() => computeOpenKeysFor(activeKey), [activeKey]);
  const [openKeys, setOpenKeys] = useState<string[]>(initialOpen);

  // When the route changes, re-sync so the active route's branch is visible.
  useEffect(() => {
    setOpenKeys(computeOpenKeysFor(activeKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  /**
   * Accordion behaviour: when the user opens a new submenu, keep ONLY its
   * ancestor chain open — siblings at every level snap closed.
   */
  const onOpenChange: MenuProps['onOpenChange'] = (keys) => {
    const newlyOpened = keys.find((k) => !openKeys.includes(k));
    if (!newlyOpened) {
      // User collapsed an existing submenu — let it through verbatim.
      setOpenKeys(keys);
      return;
    }
    const ancestors = findAncestorKeys(newlyOpened) ?? [];
    setOpenKeys([...ancestors, newlyOpened]);
  };

  const handleClick = (key: string) => {
    // Flat search through tree to find the clicked item's path.
    const stack: AdminNavItem[] = [...adminNavigation];
    while (stack.length > 0) {
      const item = stack.pop()!;
      if (item.key === key) {
        router.push(item.path);
        return;
      }
      if (item.children) stack.push(...item.children);
    }
  };

  const menuItems = adminNavigation.map((item) => toMenuItem(item, handleClick, colors));

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
              ADMIN
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 48 }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeKey]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            onClick={({ key }) => handleClick(String(key))}
            items={menuItems}
            // Override the default submenu arrow with a high-contrast chevron
            // that rotates on open — the AntD default blends into the light
            // background on this theme and is barely visible.
            expandIcon={({ isOpen }) => (
              <RightOutlined
                style={{
                  color: colors.text.primary,
                  fontSize: 12,
                  fontWeight: 700,
                  marginRight: 0,
                  transition: 'transform 0.2s ease-in-out',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            )}
          />
        </div>
      </div>
    </Sider>
  );
}
