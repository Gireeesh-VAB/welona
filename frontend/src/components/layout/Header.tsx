'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Avatar, Badge, Breadcrumb, Button, Dropdown, Layout, Space, Typography } from 'antd';
import { BellOutlined, LogoutOutlined, SafetyOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useBranchAuthStore } from '@/store/branchAuthStore';
import { useLogout } from '@/hooks/useAuth';
import { useAdminLogout } from '@/hooks/useAdminAuth';
import { useBranchLogout } from '@/hooks/useBranchAuth';
import { getNavItemByPath } from '@/config/navigation';
import { getAdminNavItemByPath } from '@/config/adminNavigation';
import { getSessionKind } from '@/lib/api-client';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const admin = useAdminAuthStore((s) => s.admin);
  const branch = useBranchAuthStore((s) => s.branch);
  const staffLogout = useLogout();
  const adminLogout = useAdminLogout();
  const branchLogout = useBranchLogout();
  const colors = useBrandColors();

  const onAdminSide = pathname === '/admin' || pathname.startsWith('/admin/');
  const isBranchSession = onAdminSide && getSessionKind() === 'branch';
  const current = onAdminSide ? getAdminNavItemByPath(pathname) : getNavItemByPath(pathname);
  const rootLabel = onAdminSide ? 'Welona Admin' : 'Welona';
  const crumbs = [{ title: rootLabel }, { title: current?.label ?? 'Dashboard' }];

  const displayName = isBranchSession
    ? branch?.branchName ?? branch?.userName ?? 'Branch'
    : onAdminSide
      ? admin?.name ?? 'Administrator'
      : user?.name ?? 'Staff';
  const displayRole = isBranchSession
    ? 'Branch user'
    : onAdminSide
      ? 'Administrator'
      : user?.roleName ?? 'Staff';

  const handleLogout = async () => {
    if (isBranchSession) {
      await branchLogout.mutateAsync().catch(() => undefined);
      router.replace('/admin/branch-login');
    } else if (onAdminSide) {
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
        padding: '0 24px',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: colors.black.secondary,
      }}
    >
      <Breadcrumb items={crumbs} />

      <Space size="large">
        {/* Branch users stay within the branch-scoped panel — no side switch. */}
        {!isBranchSession && (
          <Button
            type={onAdminSide ? 'default' : 'primary'}
            size="small"
            icon={onAdminSide ? <AppstoreOutlined /> : <SafetyOutlined />}
            onClick={() => router.push(onAdminSide ? '/' : '/admin')}
            style={
              onAdminSide
                ? {
                    background: 'transparent',
                    borderColor: colors.gold.primary,
                    color: colors.gold.primary,
                  }
                : {
                    background: colors.gold.primary,
                    borderColor: colors.gold.primary,
                    color: colors.text.onGold,
                  }
            }
          >
            {onAdminSide ? 'Employee Side' : 'Admin Side'}
          </Button>
        )}

        <Badge count={0} showZero={false}>
          <BellOutlined style={{ fontSize: 18, color: colors.text.secondary }} />
        </Badge>

        <Dropdown
          menu={{
            items: [
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
          <Space style={{ cursor: 'pointer' }}>
            <Avatar style={{ backgroundColor: colors.gold.primary, color: colors.text.onGold }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.2 }}>
              <Text style={{ display: 'block', fontSize: 13 }}>{displayName}</Text>
              <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>{displayRole}</Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
