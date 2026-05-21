'use client';

import type { ReactNode } from 'react';
import { Card, Spin, Typography } from 'antd';
import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { colors } from '@/theme/colors';

const { Text } = Typography;

interface ModuleCardProps {
  icon: ReactNode;
  title: string;
  count: number;
  loading?: boolean;
  onClick: () => void;
}

/**
 * A clickable module tile for the Customer Profile — a gold icon block plus
 * the module name and its record count. Navigates to the module's sub-page.
 */
export default function ModuleCard({ icon, title, count, loading, onClick }: ModuleCardProps) {
  return (
    <Card
      hoverable
      onClick={onClick}
      styles={{ body: { padding: 0 } }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div
          style={{
            width: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.gold.primary,
            color: colors.text.onGold,
            fontSize: 26,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            flex: 1,
            padding: '16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Text strong style={{ fontSize: 16, display: 'block' }}>
              {title}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {loading ? (
                <Spin indicator={<LoadingOutlined style={{ fontSize: 12 }} spin />} />
              ) : (
                `${count} record${count === 1 ? '' : 's'}`
              )}
            </Text>
          </div>
          <RightOutlined style={{ color: colors.text.placeholder }} />
        </div>
      </div>
    </Card>
  );
}
