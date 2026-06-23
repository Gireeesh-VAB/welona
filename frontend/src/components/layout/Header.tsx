'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Avatar, Badge, Breadcrumb, Button, Dropdown, Layout, Popover, Space, Tag, Typography } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  MenuOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useLogout } from '@/hooks/useAuth';
import { useAdminLogout } from '@/hooks/useAdminAuth';
import { getNavItemByPath } from '@/config/navigation';
import { getAdminNavItemByPath } from '@/config/adminNavigation';
import { useBrandColors } from '@/hooks/useBrandColors';
import { useAdminPendingIndentCount } from '@/hooks/useAdminIndents';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  onMobileMenuClick?: () => void;
  isMobile?: boolean;
}

export default function Header({ onMobileMenuClick, isMobile = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const admin = useAdminAuthStore((s) => s.admin);
  const staffLogout = useLogout();
  const adminLogout = useAdminLogout();
  const colors = useBrandColors();

  const onAdminSide = pathname === '/admin' || pathname.startsWith('/admin/');
  const current = onAdminSide ? getAdminNavItemByPath(pathname) : getNavItemByPath(pathname);
  const rootLabel = onAdminSide ? 'Welona Admin' : 'Branch Portal';
  const crumbs = [{ title: rootLabel }, { title: current?.label ?? 'Dashboard' }];

  const displayName = onAdminSide ? admin?.name ?? 'Administrator' : user?.name ?? 'Branch User';
  const displayRole = onAdminSide ? 'Administrator' : user?.roleName ?? 'Branch Staff';

  const { data: pendingData } = useAdminPendingIndentCount(onAdminSide);
  const pendingCount = pendingData?.meta.total ?? 0;
  const recentPending = pendingData?.items ?? [];

  const handleLogout = async () => {
    if (onAdminSide) {
      await adminLogout.mutateAsync().catch(() => undefined);
      router.replace('/admin/login');
    } else {
      await staffLogout.mutateAsync().catch(() => undefined);
      router.replace('/login');
    }
  };

  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 24px',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: colors.black.secondary,
      }}
    >
      {/* Left: hamburger (mobile) or breadcrumb (desktop) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 18, color: colors.text.secondary }} />}
            onClick={onMobileMenuClick}
            style={{ padding: '4px 8px', flexShrink: 0 }}
          />
        )}
        {!isMobile && <Breadcrumb items={crumbs} />}
        {isMobile && (
          <Text
            style={{
              color: colors.gold.primary,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {current?.label ?? 'Dashboard'}
          </Text>
        )}
      </div>

      {/* Right: actions */}
      <Space size={isMobile ? 8 : 'large'}>
        {!isMobile && (
          <Button
            type={onAdminSide ? 'default' : 'primary'}
            size="small"
            icon={onAdminSide ? <AppstoreOutlined /> : <SafetyOutlined />}
            onClick={() => router.push(onAdminSide ? '/' : '/admin')}
            style={
              onAdminSide
                ? { background: 'transparent', borderColor: colors.gold.primary, color: colors.gold.primary }
                : { background: colors.gold.primary, borderColor: colors.gold.primary, color: colors.text.onGold }
            }
          >
            {onAdminSide ? 'Employee Side' : 'Admin Side'}
          </Button>
        )}

        {onAdminSide ? (
          <Popover
            trigger="click"
            placement="bottomRight"
            arrow={false}
            content={
              <div style={{ width: 320 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Typography.Text strong style={{ color: colors.text.primary }}>Stock Requests</Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    style={{ color: colors.gold.primary, padding: 0 }}
                    onClick={() => router.push('/admin/inventory/stock-requests')}
                  >
                    View all
                  </Button>
                </div>
                {recentPending.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: colors.text.placeholder }}>
                    <InboxOutlined style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                    No pending requests
                  </div>
                ) : (
                  recentPending.map((indent) => (
                    <div
                      key={indent.id}
                      style={{
                        padding: '8px 0',
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => router.push('/admin/inventory/stock-requests')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography.Text style={{ color: colors.text.primary, fontWeight: 600, fontSize: 13 }}>
                          {indent.items[0]?.product.name ?? indent.number ?? 'Stock Request'}
                        </Typography.Text>
                        <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>Pending</Tag>
                      </div>
                      <div style={{ color: colors.text.placeholder, fontSize: 12, marginTop: 2 }}>
                        {indent.branchName} · {indent.items.length > 1 ? `${indent.items.length} products` : indent.items[0] ? `Qty: ${indent.items[0].requestedQty} ${indent.items[0].product.uom}` : ''}
                      </div>
                      {indent.reason && (
                        <div style={{ color: colors.text.placeholder, fontSize: 11, marginTop: 2 }}>
                          {indent.reason}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {pendingCount > 5 && (
                  <div
                    style={{ textAlign: 'center', paddingTop: 8, color: colors.gold.primary, fontSize: 12, cursor: 'pointer' }}
                    onClick={() => router.push('/admin/inventory/stock-requests')}
                  >
                    +{pendingCount - 5} more pending requests
                  </div>
                )}
              </div>
            }
          >
            <Badge count={pendingCount} size="small" offset={[-2, 2]}>
              <BellOutlined style={{ fontSize: 18, color: pendingCount > 0 ? colors.gold.primary : colors.text.secondary, cursor: 'pointer' }} />
            </Badge>
          </Popover>
        ) : (
          <Badge count={0} showZero={false}>
            <BellOutlined style={{ fontSize: 18, color: colors.text.secondary }} />
          </Badge>
        )}

        <Dropdown
          menu={{
            items: [
              {
                key: 'switch',
                icon: onAdminSide ? <AppstoreOutlined /> : <SafetyOutlined />,
                label: onAdminSide ? 'Employee Side' : 'Admin Side',
                onClick: () => router.push(onAdminSide ? '/' : '/admin'),
              },
              { type: 'divider' },
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Sign Out',
                danger: true,
                onClick: handleLogout,
              },
            ],
          }}
        >
          <Space style={{ cursor: 'pointer' }} size={8}>
            <Avatar style={{ backgroundColor: colors.gold.primary, color: colors.text.onGold }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            {!isMobile && (
              <div style={{ lineHeight: 1.2 }}>
                <Text style={{ display: 'block', fontSize: 13 }}>{displayName}</Text>
                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{displayRole}</Text>
              </div>
            )}
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
