'use client';

import { useState } from 'react';
import { Button, Card, Descriptions, Divider, Empty, Input, Row, Spin, Table, Tag, Typography } from 'antd';
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useInvoices, useInvoice } from '@/hooks/useSales';
import { formatDate, formatMoney } from '@shared/format';
import StatusTag from '@/components/sales/StatusTag';
import { colors } from '@/theme/colors';
import type { Invoice } from '@shared/types/sales';

const { Title, Text } = Typography;

export default function DuplicateReceiptPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: invoiceList, isLoading } = useInvoices({ search: search || undefined, page: 1, limit: 20 });
  const { data: invoice, isLoading: invLoading } = useInvoice(selectedId);

  const columns: ColumnsType<Invoice> = [
    { title: 'Invoice #', dataIndex: 'number', render: (v) => <Text style={{ color: colors.gold.primary }}>{v}</Text> },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Total', dataIndex: 'total', align: 'right', render: (v) => formatMoney(v) },
    { title: 'Paid', dataIndex: 'amountPaid', align: 'right', render: (v) => <Text style={{ color: '#22c55e' }}>{formatMoney(v)}</Text> },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'issuedAt', render: (v) => v ? formatDate(v) : '—' },
    { title: '', key: 'action', render: (_, row) => (
      <Button size="small" type="link" onClick={() => setSelectedId(row.id)}>View</Button>
    )},
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>Duplicate Receipt</Title>
          <Text style={{ color: colors.text.placeholder }}>Look up any invoice and print a duplicate copy.</Text>
        </div>
        <Input prefix={<SearchOutlined />} placeholder="Search by invoice # or customer" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} allowClear />
      </div>

      {selectedId && invoice && (
        <Card title={`Invoice — ${invoice.number}`}
          style={{ background: colors.black.secondary, border: `1px solid ${colors.gold.primary}`, marginBottom: 16 }}
          extra={
            <Button icon={<PrinterOutlined />} type="primary" onClick={() => window.print()}>Print</Button>
          }>
          <Spin spinning={invLoading}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Invoice #">{invoice.number}</Descriptions.Item>
              <Descriptions.Item label="Status"><StatusTag status={invoice.status} /></Descriptions.Item>
              <Descriptions.Item label="Customer">{invoice.customer?.name}</Descriptions.Item>
              <Descriptions.Item label="Issue Date">{invoice.issuedAt ? formatDate(invoice.issuedAt) : '—'}</Descriptions.Item>
              <Descriptions.Item label="Total">{formatMoney(invoice.total)}</Descriptions.Item>
              <Descriptions.Item label="Amount Paid">{formatMoney(invoice.amountPaid)}</Descriptions.Item>
              <Descriptions.Item label="Balance" span={2}>
                <Text strong style={{ color: (invoice.total - invoice.amountPaid) > 0 ? '#ef4444' : '#22c55e' }}>
                  {formatMoney(invoice.total - invoice.amountPaid)}
                </Text>
              </Descriptions.Item>
              {invoice.notes && <Descriptions.Item label="Notes" span={2}>{invoice.notes}</Descriptions.Item>}
            </Descriptions>
          </Spin>
          <Divider />
          <Button onClick={() => setSelectedId(null)}>Back to List</Button>
        </Card>
      )}

      <Card style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}>
        <Spin spinning={isLoading}>
          {!isLoading && (invoiceList?.items ?? []).length === 0 ? (
            <Empty description="No invoices found" />
          ) : (
            <Table rowKey="id" dataSource={invoiceList?.items ?? []} columns={columns}
              size="middle" pagination={{ pageSize: 20 }} />
          )}
        </Spin>
      </Card>
    </div>
  );
}
