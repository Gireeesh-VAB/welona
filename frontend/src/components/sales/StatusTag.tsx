'use client';

import { Tag } from 'antd';
import { titleCase } from '@shared/format';

/** Status -> Ant Design tag colour, covering every sales pipeline status. */
const STATUS_COLORS: Record<string, string> = {
  // Leads
  new: 'blue',
  contacted: 'cyan',
  qualified: 'gold',
  unqualified: 'default',
  lost: 'red',
  // Quotations / orders (converted, draft, sent, expired …)
  draft: 'default',
  sent: 'blue',
  approved: 'green',
  rejected: 'red',
  expired: 'orange',
  converted: 'green',
  pending: 'default',
  confirmed: 'blue',
  partially_delivered: 'orange',
  delivered: 'green',
  cancelled: 'red',
  // Invoices / payments
  issued: 'blue',
  partially_paid: 'orange',
  paid: 'green',
  void: 'red',
  unpaid: 'red',
  refunded: 'purple',
  // Deliveries
  scheduled: 'default',
  dispatched: 'blue',
  failed: 'red',
  returned: 'orange',
};

/** A coloured tag for any pipeline status string. */
export default function StatusTag({ status }: { status: string }) {
  return <Tag color={STATUS_COLORS[status] ?? 'default'}>{titleCase(status)}</Tag>;
}
