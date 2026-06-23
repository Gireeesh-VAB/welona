'use client';

import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatMoney } from '@shared/format';

const { Text } = Typography;

interface ServiceItem {
  id: string;
  description: string;
  quantity: number;
  lineTotal: number;
}

interface Props {
  items: ServiceItem[];
  invoiceTotal: number;
  amountPaid: number;
}

/** Proportional paid amount for one line item. */
function paidForItem(lineTotal: number, invoiceTotal: number, amountPaid: number): number {
  if (invoiceTotal === 0) return 0;
  return Math.round((lineTotal / invoiceTotal) * amountPaid);
}

export default function ServiceAllocationTable({ items, invoiceTotal, amountPaid }: Props) {
  const columns: ColumnsType<ServiceItem> = [
    {
      title: 'Service / Item',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'qty',
      width: 50,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 100,
      render: (_: unknown, row: ServiceItem) => (
        <Text style={{ fontSize: 12 }}>{formatMoney(row.lineTotal)}</Text>
      ),
    },
    {
      title: 'Paid',
      key: 'paid',
      width: 100,
      render: (_: unknown, row: ServiceItem) => {
        const paid = paidForItem(row.lineTotal, invoiceTotal, amountPaid);
        return (
          <Text style={{ fontSize: 12, color: paid >= row.lineTotal ? '#2e7d32' : '#c05400' }}>
            {formatMoney(paid)}
          </Text>
        );
      },
    },
    {
      title: 'Outstanding',
      key: 'outstanding',
      width: 110,
      render: (_: unknown, row: ServiceItem) => {
        const paid = paidForItem(row.lineTotal, invoiceTotal, amountPaid);
        const outstanding = Math.max(0, row.lineTotal - paid);
        return (
          <Text style={{ fontSize: 12, color: outstanding === 0 ? '#2e7d32' : '#c62828' }}>
            {formatMoney(outstanding)}
          </Text>
        );
      },
    },
  ];

  return (
    <Table<ServiceItem>
      dataSource={items}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      style={{ fontSize: 12 }}
      rowClassName={(row) => {
        const paid = paidForItem(row.lineTotal, invoiceTotal, amountPaid);
        if (paid >= row.lineTotal) return 'service-row-paid';
        if (paid > 0) return 'service-row-partial';
        return '';
      }}
    />
  );
}
