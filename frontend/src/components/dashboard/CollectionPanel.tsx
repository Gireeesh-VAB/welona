'use client';

import { Card, Empty, Typography } from 'antd';
import { formatMoney } from '@shared/format';
import { colors } from '@/theme/colors';

const { Text } = Typography;

export interface CollectionRow {
  label: string;
  amount: number;
}

interface CollectionPanelProps {
  title: string;
  /** Optional muted suffix next to the title, e.g. a from-date. */
  subtitle?: string;
  rows: CollectionRow[];
  total: number;
  loading?: boolean;
  emptyText?: string;
}

/**
 * A collection breakdown card — labelled amount rows with a total footer.
 * Reused for collection-by-method and per-employee collection.
 */
export default function CollectionPanel({
  title,
  subtitle,
  rows,
  total,
  loading,
  emptyText = 'No collections',
}: CollectionPanelProps) {
  return (
    <Card
      loading={loading}
      title={
        <span>
          {title}
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
              {subtitle}
            </Text>
          )}
        </span>
      }
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      ) : (
        rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <Text>{r.label}</Text>
            <Text strong>{formatMoney(r.amount)}</Text>
          </div>
        ))
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
        <Text strong>Total</Text>
        <Text strong style={{ color: colors.gold.primary }}>
          {formatMoney(total)}
        </Text>
      </div>
    </Card>
  );
}
