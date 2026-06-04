'use client';

import { Empty, Spin, Tag, Timeline, Typography } from 'antd';
import { useAdminCustomerHistory } from '@/hooks/useAdminCustomers';
import { titleCase } from '@shared/format';
import type { HistoryEvent } from '@shared/types/customer-modules';

const { Text } = Typography;

/** Timeline dot colour by event type. */
const TYPE_COLOR: Record<string, string> = {
  customer: 'gold',
  enquiry: 'blue',
  followup: 'cyan',
  quotation: 'blue',
  order: 'green',
  invoice: 'green',
  booking: 'blue',
  package: 'gold',
  offer: 'gold',
  prescription: 'red',
  report: 'red',
  feedback: 'green',
  document: 'gray',
};

/** Format an ISO timestamp as a readable date + time. */
function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * History module — a read-only activity timeline aggregated from every
 * customer touchpoint.
 */
export default function HistoryTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useAdminCustomerHistory(customerId);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  const events = data ?? [];
  if (events.length === 0) {
    return <Empty description="No activity recorded yet" />;
  }

  return (
    <Timeline
      items={events.map((e: HistoryEvent) => ({
        color: TYPE_COLOR[e.type] ?? 'blue',
        children: (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text strong>{e.title}</Text>
              <Tag>{titleCase(e.type)}</Tag>
            </div>
            {e.detail && (
              <Text style={{ display: 'block', marginTop: 2 }}>{e.detail}</Text>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDateTime(e.at)}
            </Text>
          </div>
        ),
      }))}
    />
  );
}
