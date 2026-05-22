'use client';

import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import { colors } from '@/theme/colors';

const { Text } = Typography;

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
}

/** A KPI tile — gold icon block plus a headline value and label. */
export default function StatCard({ icon, label, value, loading }: StatCardProps) {
  return (
    <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div
          style={{
            width: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.gold.primary,
            color: colors.text.onGold,
            fontSize: 24,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, padding: '14px 16px' }}>
          <Text style={{ fontSize: 22, fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
            {loading ? '—' : value}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {label}
          </Text>
        </div>
      </div>
    </Card>
  );
}
