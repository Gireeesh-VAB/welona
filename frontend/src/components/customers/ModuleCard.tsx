'use client';

import type { ReactNode } from 'react';
import { Card, Spin, Typography } from 'antd';
import { LoadingOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { colors } from '@/theme/colors';

const { Text } = Typography;

interface ModuleCardProps {
  icon: ReactNode;
  title: string;
  count: number;
  loading?: boolean;
  onClick: () => void;
  onAdd?: (e: React.MouseEvent) => void;
}

export default function ModuleCard({ icon, title, count, loading, onClick, onAdd }: ModuleCardProps) {
  return (
    <div style={{ position: 'relative', display: 'block' }}>
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

      {onAdd && (
        <div
          onClick={(e) => { e.stopPropagation(); onAdd(e); }}
          title="Add Booking"
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: colors.gold.primary,
            color: colors.text.onGold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            zIndex: 10,
            border: '2px solid #fff',
            lineHeight: 1,
          }}
        >
          <PlusOutlined style={{ fontSize: 11 }} />
        </div>
      )}
    </div>
  );
}
